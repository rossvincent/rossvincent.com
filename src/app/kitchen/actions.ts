"use server";

import { redirect } from "next/navigation";
import { verifyKitchenSession } from "./lib/auth-check";
import { deleteKitchenSession } from "./lib/session";
import { mutateState } from "./lib/store";
import type { KitchenState } from "./lib/week";

export interface SaveResult {
  state?: KitchenState;
  error?: string;
}

// One wrapper so every action checks the session before it touches anything.
// Server Actions are their own public endpoints; the page having checked once
// on render is not a check on the action.
async function guarded(
  weekId: string,
  change: (s: KitchenState) => KitchenState
): Promise<SaveResult> {
  await verifyKitchenSession();
  try {
    return { state: await mutateState(weekId, change) };
  } catch (e) {
    if (e instanceof Error && e.name === "StoreNotReady") {
      return { error: "Nothing is saved yet: the store has not been connected." };
    }
    return { error: "That did not save. Try again in a moment." };
  }
}

export async function setPick(weekId: string, dayKey: string, mealId: string): Promise<SaveResult> {
  return guarded(weekId, (s) => ({ ...s, picks: { ...s.picks, [dayKey]: mealId } }));
}

export async function addTopUp(weekId: string, text: string): Promise<SaveResult> {
  const clean = text.trim().slice(0, 80);
  if (!clean) return { error: "Type something first." };
  const item = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, text: clean, got: false };
  return guarded(weekId, (s) => ({ ...s, topups: [...s.topups, item] }));
}

export async function toggleTopUp(weekId: string, id: string): Promise<SaveResult> {
  return guarded(weekId, (s) => ({
    ...s,
    topups: s.topups.map((t) => (t.id === id ? { ...t, got: !t.got } : t)),
  }));
}

export async function removeTopUp(weekId: string, id: string): Promise<SaveResult> {
  return guarded(weekId, (s) => ({ ...s, topups: s.topups.filter((t) => t.id !== id) }));
}

export async function setApproved(weekId: string, by: string | null): Promise<SaveResult> {
  const at = new Date().toLocaleString("en-GB", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/London",
  });
  return guarded(weekId, (s) => ({ ...s, approved: by ? { by, at } : null }));
}

export async function kitchenLogout(): Promise<void> {
  await deleteKitchenSession();
  redirect("/kitchen/login");
}
