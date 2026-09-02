import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "./jwt.ts";

// Defense in depth. proxy.ts does the optimistic, fast, cookie-shaped check
// on the way in; this is the real one, and it runs again inside
// board/page.tsx. Next's own auth guide is explicit that proxy must never
// be the only gate, so this exists deliberately rather than trusting proxy
// alone. cache() means multiple calls within one render pass only verify
// the cookie once.
export const verifySession = cache(async (): Promise<void> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const valid = await verifyToken(token);
  if (!valid) {
    redirect("/board/login");
  }
});
