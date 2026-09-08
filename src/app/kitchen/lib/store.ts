import "server-only";
import { get, put } from "@vercel/blob";
import { emptyState, mergeTopUps, type KitchenState } from "./week.ts";

// Where the taps live. The week itself (which dinners are proposed, what is
// in each one) comes from the ClaudeOS repo, exactly the way the board reads
// ACTIVE.md. Only what a human changes on the page lives here.
//
// The store is private, so the JSON is never reachable by URL: reading it
// goes through get() on the server with the project's own token.
const pathFor = (weekId: string) => `kitchen/state-${weekId}.json`;

export class StoreNotReady extends Error {
  constructor() {
    super("No blob store is connected yet.");
    this.name = "StoreNotReady";
  }
}

function assertConfigured(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new StoreNotReady();
}

export function storeConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readState(weekId: string): Promise<KitchenState> {
  if (!storeConfigured()) return emptyState(weekId);
  const res = await get(pathFor(weekId), { access: "private", useCache: false });
  // A week nobody has touched yet has no blob at all. That is the normal
  // first-run case, not an error.
  if (!res || res.statusCode !== 200 || !res.stream) return emptyState(weekId);
  try {
    const text = await new Response(res.stream).text();
    const parsed = JSON.parse(text) as Partial<KitchenState>;
    return {
      ...emptyState(weekId),
      ...parsed,
      weekId,
      topups: Array.isArray(parsed.topups) ? parsed.topups : [],
      picks: parsed.picks && typeof parsed.picks === "object" ? parsed.picks : {},
    };
  } catch {
    // A corrupt blob should not take the page down. Start the week again
    // rather than showing an error page in a kitchen.
    return emptyState(weekId);
  }
}

async function writeState(state: KitchenState): Promise<KitchenState> {
  assertConfigured();
  const next = { ...state, updatedAt: new Date().toISOString() };
  await put(pathFor(state.weekId), JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return next;
}

// Every change is a read, a merge and a write rather than a blind overwrite,
// because two people can be tapping at the same time on two phones. Picks are
// last-writer-wins, which is fine for a single value. Top-ups merge by id, so
// nothing anyone typed disappears.
export async function mutateState(
  weekId: string,
  change: (current: KitchenState) => KitchenState
): Promise<KitchenState> {
  assertConfigured();
  const current = await readState(weekId);
  const proposed = change(current);
  return writeState({
    ...proposed,
    topups: mergeTopUps(proposed.topups, current.topups),
  });
}
