import "server-only";
import { cookies } from "next/headers";
import { KITCHEN_COOKIE, signKitchenSession } from "./jwt.ts";

// A year, not the board's thirty days. This is a page someone opens in a
// kitchen once a week; being logged out every month would end its use.
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 365;

export async function createKitchenSession(): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const token = await signKitchenSession(expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(KITCHEN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteKitchenSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(KITCHEN_COOKIE);
}
