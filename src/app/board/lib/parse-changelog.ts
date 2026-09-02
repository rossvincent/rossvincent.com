// Parses ~/ClaudeOS/CHANGELOG.md: the newest few dated ## entries, each
// reduced to its heading plus a one-line summary (the entries themselves
// run to full paragraphs, which belong in ClaudeOS, not on this page).

import { clean, truncate } from "./md";

export interface ChangelogEntry {
  heading: string;
  summary: string;
}

export function parseChangelog(text: string, limit = 3): ChangelogEntry[] {
  const lines = text.split("\n");
  const headingIdxs: number[] = [];
  lines.forEach((l, i) => {
    if (/^## \d{4}-\d{2}-\d{2}/.test(l)) headingIdxs.push(i);
  });

  const entries: ChangelogEntry[] = [];
  for (let n = 0; n < Math.min(limit, headingIdxs.length); n++) {
    const start = headingIdxs[n];
    const end = n + 1 < headingIdxs.length ? headingIdxs[n + 1] : lines.length;
    const heading = clean(lines[start].replace(/^##\s*/, ""));
    const bodyLines = lines
      .slice(start + 1, end)
      .map((l) => l.trim())
      .filter(Boolean);
    const summary = bodyLines.length ? truncate(clean(bodyLines[0]), 240) : "";
    entries.push({ heading, summary });
  }
  return entries;
}
