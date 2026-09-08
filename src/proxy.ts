import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/app/board/lib/jwt";
import { KITCHEN_COOKIE, verifyKitchenToken } from "@/app/kitchen/lib/jwt";

// Next.js 16 renamed middleware.ts to proxy.ts (same NextRequest/
// NextResponse API, same matcher mechanism, defaults to the Node.js
// runtime now rather than Edge-only). This is the optimistic, fast check;
// each page runs the real one again via its own verify helper, per Next's
// own guidance that proxy must never be the only gate.
export const config = {
  matcher: ["/board/:path*", "/kitchen/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Excluded in the function body rather than via matcher regex - simpler,
  // and harder to get wrong than a negative-lookahead pattern.
  if (pathname === "/board/login" || pathname === "/kitchen/login") {
    return NextResponse.next();
  }

  const boardToken = request.cookies.get(COOKIE_NAME)?.value;

  // The kitchen has its own door and its own password, so Emily can be given
  // one that opens the meal plan and nothing else. A board session opens the
  // kitchen too, so Ross logs in once; a kitchen session never opens the
  // board, because the board branch below only ever looks at its own cookie.
  if (pathname.startsWith("/kitchen")) {
    const kitchenToken = request.cookies.get(KITCHEN_COOKIE)?.value;
    if (await verifyKitchenToken(kitchenToken)) return NextResponse.next();
    if (await verifyToken(boardToken)) return NextResponse.next();
    return NextResponse.redirect(new URL("/kitchen/login", request.url));
  }

  if (!(await verifyToken(boardToken))) {
    return NextResponse.redirect(new URL("/board/login", request.url));
  }

  return NextResponse.next();
}
