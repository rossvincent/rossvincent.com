// Parses ~/ClaudeOS/SOCIAL.md: the "Not yet cross-posted" gap and the
// newest few posts. Deliberately reads SOCIAL.md rather than the raw
// social-log.json, since SOCIAL.md already computes the cross-platform
// cross-post-gap logic that scripts/social.py owns; reimplementing that
// matching from the raw JSON would be a second, divergent copy of it.

import { clean, rowsBetween, sectionLines } from "./md";

export interface SocialPost {
  date: string;
  platform: string;
  post: string;
  format: string;
}

export interface SocialData {
  notYetCrossPosted: string;
  recentPosts: SocialPost[];
}

export function parseSocial(text: string, limit = 5): SocialData {
  const lines = text.split("\n");

  const gapLines = sectionLines(lines, /^## Not yet cross-posted/, /^## /);
  const notYetCrossPosted = gapLines
    .map((l) => clean(l))
    .filter(Boolean)
    .join(" ");

  const postRows = rowsBetween(lines, /^## All posts/, /^## Detail/).slice(
    0,
    limit
  );
  const recentPosts: SocialPost[] = postRows
    .filter((cells) => cells.length >= 4)
    .map((cells) => ({
      date: clean(cells[0]),
      platform: clean(cells[1]),
      post: clean(cells[2]),
      format: clean(cells[3]),
    }));

  return { notYetCrossPosted, recentPosts };
}
