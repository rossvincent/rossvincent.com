// Markdown-cell and table-extraction primitives, ported from
// ~/ClaudeOS/scripts/board-build.py so the two stay behaviourally identical.
// Keep this file in sync with that script's clean()/rows_between()/etc if
// either one changes its parsing rules.

export type Row = string[];

export function clean(text: string): string {
  let t = text.trim();
  t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2"); // [[path|Alias]] -> Alias
  t = t.replace(/\[\[([^\]]+)\]\]/g, "$1"); // [[note]] -> note
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // [text](url) -> text
  t = t.replace(/~~/g, "");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1"); // bold
  t = t.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1"); // italic
  t = t.replace(/`/g, "");
  t = t.replace(/\\\|/g, "|");
  return t.replace(/\s+/g, " ").trim();
}

// Return [cell without its **Board:** line, the Board line or null].
export function splitBoard(cell: string): [string, string | null] {
  const m = cell.match(/\*\*Board:\*\*\s*([\s\S]+?)\s*$/);
  if (!m || m.index === undefined) return [cell, null];
  return [cell.slice(0, m.index).trimEnd(), m[1].trim()];
}

// ACTIVE.md titles carry qualifiers the board has no room for.
export function shortTitle(text: string): string {
  let t = clean(text);
  t = t.replace(/\s*\([^()]*\)\s*$/, ""); // trailing parenthetical
  t = t.replace(/\s*[-–]\s*DATED:.*$/i, "");
  if (t.includes(": ")) {
    const head = t.split(": ")[0];
    if (head.length >= 18) t = head;
  }
  return t.trim();
}

export function successOf(cell: string): string {
  const m = cell.match(/\*\*Success:\*\*\s*([\s\S]+?)(?=\s\*\*[A-Z]|$)/);
  return m ? clean(m[1]) : "";
}

// Yield the data rows of the first markdown table in a section, matching
// board-build.py's rows_between(). startPat/stopPat must be anchored with
// ^ (they are matched line-by-line, Python re.match style).
export function rowsBetween(
  lines: string[],
  startPat: RegExp,
  stopPat: RegExp
): Row[] {
  const startIdx = lines.findIndex((l) => startPat.test(l));
  if (startIdx === -1) return [];
  const out: Row[] = [];
  for (const line of lines.slice(startIdx + 1)) {
    if (stopPat.test(line)) break;
    if (!line.startsWith("|")) continue;
    if (/^\|[\s:-]+\|/.test(line)) continue; // the |---|---| separator
    const cells = line
      .trim()
      .replace(/^\|+/, "")
      .replace(/\|+$/, "")
      .split(" | ")
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    const first = cells[0].toLowerCase();
    if (first === "task" || first === "date") continue;
    out.push(cells);
  }
  return out;
}

// Raw lines (not a table) between two section markers, for prose sections
// like SOCIAL.md's "Not yet cross-posted" or a CHANGELOG.md entry's body.
export function sectionLines(
  lines: string[],
  startPat: RegExp,
  stopPat: RegExp
): string[] {
  const startIdx = lines.findIndex((l) => startPat.test(l));
  if (startIdx === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(startIdx + 1)) {
    if (stopPat.test(line)) break;
    out.push(line);
  }
  return out;
}

// Cut long prose down for a collapsed-row summary, breaking on a word
// boundary. Used for changelog/decision bodies, which run to full
// paragraphs in their source files.
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
