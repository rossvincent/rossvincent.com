// The kitchen's own session, deliberately separate from the board's. Its own
// cookie name and its own secret, so a kitchen password can never open the
// board: a kitchen token simply fails to verify against the board's secret.
// The convenience runs one way only, in auth-check.ts, where a valid board
// token is also accepted here.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const KITCHEN_COOKIE = "kitchen_session";

function secretKey(): Uint8Array {
  const secret = process.env.KITCHEN_SESSION_SECRET;
  if (!secret) {
    throw new Error("KITCHEN_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signKitchenSession(expiresAt: Date): Promise<string> {
  const payload: JWTPayload = { kitchen: true };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
}

export async function verifyKitchenToken(
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
