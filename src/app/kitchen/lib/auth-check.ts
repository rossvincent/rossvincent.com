import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { KITCHEN_COOKIE, verifyKitchenToken } from "./jwt.ts";
import { COOKIE_NAME as BOARD_COOKIE, verifyToken as verifyBoardToken } from "@/app/board/lib/jwt.ts";

// Same defence-in-depth shape as the board: proxy.ts does the fast check on
// the way in, this is the real one and it runs again inside the page.
//
// A board session also opens the kitchen, so Ross logs in once. The reverse
// is never true: the board's own check knows nothing about the kitchen
// cookie, so a kitchen password reaches the meal plan and stops there.
export const verifyKitchenSession = cache(async (): Promise<void> => {
  const cookieStore = await cookies();
  if (await verifyKitchenToken(cookieStore.get(KITCHEN_COOKIE)?.value)) return;
  if (await verifyBoardToken(cookieStore.get(BOARD_COOKIE)?.value)) return;
  redirect("/kitchen/login");
});
