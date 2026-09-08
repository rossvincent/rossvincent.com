// No "server-only" guard, matching board/lib/password.ts, so this can be
// unit-tested under plain node --test. The constant-time comparison itself
// is imported rather than copied: there should be exactly one of those in
// the codebase.
import { timingSafeEqualStr } from "../../board/lib/password.ts";

export function checkKitchenPassword(submitted: string): boolean {
  const expected = (process.env.KITCHEN_PASSWORD || "").trim();
  // Same 20-character floor as the board: it doubles as a "not configured"
  // trip-wire, so an unset variable can never let an empty guess through.
  if (expected.length < 20) return false;
  return timingSafeEqualStr(submitted.trim(), expected);
}
