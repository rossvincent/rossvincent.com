"use server";

import { redirect } from "next/navigation";
import { checkPassword } from "@/app/board/lib/password";
import { rateLimited, getClientIp } from "@/app/board/lib/rate-limit";
import { createSession } from "@/app/board/lib/session";

export interface LoginState {
  error?: string;
}

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const ip = await getClientIp();
  if (rateLimited("board-login", ip, MAX_ATTEMPTS, WINDOW_MS)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const password = String(formData.get("password") || "");
  if (!checkPassword(password)) {
    return { error: "Wrong password." };
  }

  // redirect() throws internally (NEXT_REDIRECT) - it must stay outside
  // any try/catch, or a wrapping catch would swallow a successful login.
  await createSession();
  redirect("/board");
}
