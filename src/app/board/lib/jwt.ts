// Pure JWT sign/verify, deliberately with no next/headers dependency, so
// it can be unit-tested under plain node --test and imported from proxy.ts
// (which reads its cookie off the NextRequest directly, not via
// next/headers). session.ts wraps this with the actual cookie-setting,
// which does need next/headers and only works inside a real Next.js
// request.

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIE_NAME = "board_session";

function secretKey(): Uint8Array {
  const secret = process.env.BOARD_SESSION_SECRET;
  if (!secret) {
    throw new Error("BOARD_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(expiresAt: Date): Promise<string> {
  const payload: JWTPayload = { board: true };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
}

export async function verifyToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
