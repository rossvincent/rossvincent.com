import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/app/board/lib/jwt";

// Next.js 16 renamed middleware.ts to proxy.ts (same NextRequest/
// NextResponse API, same matcher mechanism, defaults to the Node.js
// runtime now rather than Edge-only). This is the optimistic, fast check;
// board/page.tsx runs the real one again via verifySession(), per Next's
// own guidance that proxy must never be the only gate.
export const config = {
  matcher: ["/board/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Excluded in the function body rather than via matcher regex - simpler,
  // and harder to get wrong than a negative-lookahead pattern.
  if (pathname === "/board/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = await verifyToken(token);

  if (!valid) {
    return NextResponse.redirect(new URL("/board/login", request.url));
  }

  return NextResponse.next();
}
