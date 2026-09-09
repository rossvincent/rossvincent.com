import type { Metadata } from "next";
import { fetchRepoFile } from "@/app/board/lib/github";
import { verifyKitchenSession } from "./lib/auth-check";
import { readState, storeConfigured } from "./lib/store";
import { parseWeek, emptyState } from "./lib/week";
import KitchenView from "./KitchenView";
import "./kitchen.css";

export const metadata: Metadata = {
  title: "Kitchen",
  robots: { index: false, follow: false },
};

// Never statically rendered: it reads a cookie and live state.
export const dynamic = "force-dynamic";

const WEEK_PATH = "projects/kitchen/weeks/current.json";

export default async function KitchenPage() {
  await verifyKitchenSession();

  let week;
  try {
    week = parseWeek(await fetchRepoFile(WEEK_PATH, { fresh: true }));
  } catch (e) {
    // A broken or missing week file is worth saying plainly rather than
    // showing an empty page in a kitchen with the shopping still to do.
    return (
      <div className="kt">
        <div className="kt-wrap">
          <h1>No week to show</h1>
          <p className="kt-sub" style={{ marginTop: "1rem" }}>
            The meal plan file could not be read, so there is nothing to cook from here yet. It
            lives in the ClaudeOS repo at {WEEK_PATH}.
          </p>
          <p className="kt-hint">{e instanceof Error ? e.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const ready = storeConfigured();
  const state = ready ? await readState(week.weekId) : emptyState(week.weekId);

  return <KitchenView week={week} initialState={state} storeReady={ready} />;
}
