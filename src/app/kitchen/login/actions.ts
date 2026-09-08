"use server";

import { redirect } from "next/navigation";
import { checkKitchenPassword } from "../lib/password";
import { rateLimited, getClientIp } from "@/app/board/lib/rate-limit";
import { createKitchenSession } from "../lib/session";

export interface KitchenLoginState {
  error?: string;
}

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function kitchenLogin(
  _prevState: KitchenLoginState,
  formData: FormData
): Promise<KitchenLoginState> {
  const ip = await getClientIp();
  // Its own rate-limit scope, so someone guessing at the kitchen door cannot
  // lock Ross out of the board, and the other way round.
  if (rateLimited("kitchen-login", ip, MAX_ATTEMPTS, WINDOW_MS)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const password = String(formData.get("password") || "");
  if (!checkKitchenPassword(password)) {
    return { error: "Wrong password." };
  }

  // redirect() throws internally, so it stays outside any try/catch.
  await createKitchenSession();
  redirect("/kitchen");
}
