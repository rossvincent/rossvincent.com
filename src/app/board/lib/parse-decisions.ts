// Parses ~/ClaudeOS/memory/decisions-log.md: newest N rows only. The file
// is already newest-first, so "newest N" is just "first N data rows" -
// no date parsing or sorting needed.

import { clean, truncate } from "./md";

export interface DecisionItem {
  date: string;
  headline: string;
  decision: string;
  reasoning: string;
  implications: string;
}

function headlineOf(cell: string): string {
  const m = cell.match(/\*\*(.+?)\*\*/);
  const raw = m ? m[1] : cell;
  return truncate(clean(raw), 160);
}

export function parseDecisions(text: string, limit = 5): DecisionItem[] {
  const lines = text.split("\n");
  const headerIdx = lines.findIndex((l) =>
    /^\|\s*Date\s*\|\s*Decision\s*\|/.test(l)
  );
  if (headerIdx === -1) return [];

  const items: DecisionItem[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (items.length >= limit) break;
    if (!line.startsWith("|")) continue;
    if (/^\|[\s:-]+\|/.test(line)) continue; // the |---|---| separator
    const cells = line
      .trim()
      .replace(/^\|+/, "")
      .replace(/\|+$/, "")
      .split(" | ")
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    items.push({
      date: clean(cells[0]),
      headline: headlineOf(cells[1]),
      decision: clean(cells[1]),
      reasoning: clean(cells[2]),
      implications: clean(cells[3]),
    });
  }
  return items;
}
