// Deliberately no "server-only" guard: this file is unit-tested directly
// under plain node --test, which can't resolve that package outside a
// bundler. It's never imported from a "use client" file (only from the
// login Server Action), so the real protection - never shipping it to the
// browser - already comes from that boundary.
import { timingSafeEqual } from "node:crypto";

// Ported from ~/ClaudeOS/projects/soul-synthesis/site/api/_lib.js's
// timingSafeEqualStr: a length mismatch is compared against itself first so
// a wrong-length guess takes the same time as a right-length one.
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

// The 20-character floor matches the same file's own password-length
// guard: it is both a "not configured" trip-wire and a nudge toward a
// genuinely long passphrase, which is this page's stand-in for heavier
// login-throttling infrastructure.
export function checkPassword(submitted: string): boolean {
  const expected = process.env.BOARD_PASSWORD || "";
  if (expected.length < 20) return false;
  return timingSafeEqualStr(submitted, expected);
}
