// Faithful TypeScript port of ~/ClaudeOS/scripts/board-build.py's ACTIVE.md
// parsing (parse_gate, parse_tasks, parse_blocked, parse_when/parse_dates).
// Keep behaviourally identical to that script; it is the tested reference.

import { clean, rowsBetween, splitBoard, shortTitle, successOf, type Row } from "./md.ts";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export interface Gate {
  eyebrow: string;
  title: string;
  when: string;
  body: string;
  preflightTitle: string;
  preflightNote: string;
  steps: string[];
}

export interface TaskItem {
  tag: string;
  money: boolean;
  owner: string;
  added: string;
  title: string;
  success: string;
  status: string;
}

export interface BlockedItem {
  severity: "crit" | "warn";
  tag: string;
  owner: string;
  since: string;
  title: string;
  body: string;
  next: string;
}

export interface DateItem {
  level: "missed" | "ship" | "plain";
  when: string;
  desc: string;
}

export interface TasksZone {
  id: "now" | "next";
  kind: "tasks";
  title: string;
  note: string;
  items: TaskItem[];
}

export interface BlockedZone {
  id: "blocked";
  kind: "blocked";
  title: string;
  note: string;
  items: BlockedItem[];
}

export interface DatesZone {
  id: "dates";
  kind: "dates";
  title: string;
  note: string;
  items: DateItem[];
}

export interface ActiveBoardData {
  meta: { asOf: string; shipISO: string; source: "ACTIVE.md" };
  gate: Gate;
  zones: [TasksZone, BlockedZone, DatesZone, TasksZone];
}

// Month-only dates resolve to the last day of that month, so "Aug 2026"
// does not flip to missed on the 1st.
function lastDayOfMonth(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12, 0));
}

function parseWhen(text: string): Date | null {
  const t = clean(text).replace(/~/g, "").trim();

  let m = t.match(/mid[-\s]([A-Za-z]{3})[a-z]*\s+(\d{4})/i);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) return new Date(Date.UTC(Number(m[2]), mon - 1, 15));
  }

  m = t.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) {
      const year = Number(m[3]);
      const day = Number(m[1]);
      const d = new Date(Date.UTC(year, mon - 1, day));
      const overflowed =
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== mon - 1 ||
        d.getUTCDate() !== day;
      return overflowed ? null : d;
    }
  }

  m = t.match(/([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) return lastDayOfMonth(Number(m[2]), mon);
  }

  return null;
}

function parseGate(text: string): [Gate, string] | null {
  const m = text.match(/<!-- board:gate -->([\s\S]*?)<!-- \/board:gate -->/);
  if (!m) return null;

  const fields: Record<string, string> = {};
  const steps: string[] = [];
  for (const line of m[1].split("\n")) {
    const f = line.match(/^\s*-\s*\*\*(.+?):\*\*\s*(.*)$/);
    if (!f) continue;
    const key = f[1].trim().toLowerCase();
    const val = f[2].trim();
    if (key === "step") {
      steps.push(clean(val));
    } else {
      fields[key] = clean(val);
    }
  }

  if (!fields["title"]) return null;

  const gate: Gate = {
    eyebrow: fields["eyebrow"] ?? "Ship gate",
    title: fields["title"],
    when: fields["when"] ?? "",
    body: fields["body"] ?? "",
    preflightTitle: fields["pre-flight title"] ?? "What is actually left",
    preflightNote: fields["pre-flight note"] ?? "",
    steps,
  };
  return [gate, fields["iso"] ?? ""];
}

function parseTasks(
  rows: Row[],
  requireBoard: boolean
): { items: TaskItem[]; missing: string[] } {
  const items: TaskItem[] = [];
  const missing: string[] = [];
  for (const cells of rows) {
    if (cells.length < 5) continue;
    const title = shortTitle(cells[0]);
    const [notes, board] = splitBoard(cells[4]);
    if (board === null) {
      if (requireBoard) {
        missing.push(title);
      } else {
        continue;
      }
    }
    const tag = clean(cells[1]);
    items.push({
      tag,
      money: ["£now", "£unlock"].includes(tag.toLowerCase()),
      owner: clean(cells[2]).replace(/\//g, " + "),
      added: clean(cells[3]),
      title,
      success: successOf(notes),
      status: board ? clean(board) : clean(notes),
    });
  }
  return { items, missing };
}

function parseBlocked(rows: Row[]): BlockedItem[] {
  const items: BlockedItem[] = [];
  for (const cells of rows) {
    if (cells.length < 4) continue;
    const [why, board] = splitBoard(cells[1]);
    let severity = "warn";
    let tag = "blocked";
    let owner = "Ross";
    let body = board ? clean(board) : clean(why);

    const chip = body.match(/^\((.+?)\)\s*([\s\S]*)$/);
    if (chip) {
      const parts = chip[1].split(/\s+[-·]\s+/).map((p) => p.trim());
      if (parts.length === 3) {
        [severity, tag, owner] = parts;
        body = chip[2].trim();
      }
    }

    items.push({
      severity: severity === "crit" ? "crit" : "warn",
      tag,
      owner,
      since: clean(cells[2]),
      title: shortTitle(cells[0]),
      body,
      next: clean(cells[3]),
    });
  }
  return items;
}

function parseDates(rows: Row[], gateTitle: string, today: Date): DateItem[] {
  const withKey: Array<DateItem & { _key: Date }> = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    let when = clean(cells[0]);
    const desc = clean(cells[1]);
    const day = parseWhen(cells[0]);
    const firstWord = gateTitle.split(/\s+/)[0]?.toLowerCase() ?? "";
    const isShip =
      Boolean(gateTitle) &&
      firstWord.length > 0 &&
      desc.toLowerCase().includes(firstWord) &&
      desc.toLowerCase().includes("go live");

    let level: DateItem["level"];
    if (when.toUpperCase().startsWith("MISSED") || (day && day.getTime() < today.getTime() && !isShip)) {
      level = "missed";
      when = "MISSED  " + when.replace(/^MISSED\s*/, "");
    } else if (isShip) {
      level = "ship";
    } else {
      level = "plain";
    }

    withKey.push({ level, when, desc, _key: day ?? new Date(Date.UTC(9999, 11, 31)) });
  }
  withKey.sort((a, b) => a._key.getTime() - b._key.getTime());
  return withKey.map(({ _key, ...rest }) => rest);
}

export function parseActive(text: string, today: Date): ActiveBoardData {
  const lines = text.split("\n");

  const gateResult = parseGate(text);
  if (!gateResult) {
    throw new Error("parseActive: no <!-- board:gate --> block found in ACTIVE.md");
  }
  const [gate, iso] = gateResult;

  const nowRows = rowsBetween(lines, /^### NOW/, /^### NEXT/);
  const nextRows = rowsBetween(lines, /^### NEXT/, /^### DELEGATE/);
  const blockedRows = rowsBetween(lines, /^## Blocked/, /^## Key Dates/);
  const dateRows = rowsBetween(lines, /^## Key Dates/, /^## Completed/);

  const { items: now } = parseTasks(nowRows, true);
  const { items: nxt } = parseTasks(nextRows, false);
  const blocked = parseBlocked(blockedRows);
  const dates = parseDates(dateRows, gate.title, today);

  const asOf = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    meta: { asOf, shipISO: iso, source: "ACTIVE.md" },
    gate,
    zones: [
      { id: "now", kind: "tasks", title: "Now", note: `${now.length} of five. Hard limit.`, items: now },
      { id: "blocked", kind: "blocked", title: "Blocked", note: "Named, not quietly waited on.", items: blocked },
      { id: "dates", kind: "dates", title: "Dates", note: "Missed ones stay on the board.", items: dates },
      { id: "next", kind: "tasks", title: "Next", note: "Top rows only. The full list stays in ACTIVE.md.", items: nxt },
    ],
  };
}
