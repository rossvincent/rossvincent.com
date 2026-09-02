import "server-only";
import { headers } from "next/headers";

// Ported from ~/ClaudeOS/projects/soul-synthesis/site/api/_lib.js. In-memory
// sliding-window limiter. Serverless honesty: state lives per warm instance,
// so this is a speed bump, not a wall - a real second layer, if ever needed,
// would be a Vercel Firewall rate rule on /board/login.
const buckets = new Map<string, number[]>();

export function rateLimited(
  scope: string,
  ip: string,
  limit: number,
  windowMs: number
): boolean {
  const key = `${scope}|${ip}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10000) buckets.clear(); // memory backstop, resets the window
  return hits.length > limit;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff =
    h.get("x-real-ip") ??
    h.get("x-vercel-forwarded-for") ??
    h.get("x-forwarded-for") ??
    "";
  return xff.split(",")[0]?.trim() || "unknown";
}
