import { test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { verifyToken } from "./jwt.ts";

// session.ts (createSession/deleteSession) uses next/headers, which only
// resolves inside a real Next.js request - not available under plain
// node --test. jwt.ts has no such dependency, so that's what gets
// exercised here directly.

process.env.BOARD_SESSION_SECRET = "test-secret-not-for-real-use-1234567890";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.BOARD_SESSION_SECRET);
}

test("verifyToken: a freshly signed token verifies", async () => {
  const token = await new SignJWT({ board: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
  assert.equal(await verifyToken(token), true);
});

test("verifyToken: a tampered token is rejected", async () => {
  const token = await new SignJWT({ board: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
  const tampered = token.slice(0, -4) + "abcd";
  assert.equal(await verifyToken(tampered), false);
});

test("verifyToken: an expired token is rejected", async () => {
  const token = await new SignJWT({ board: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("-1s")
    .sign(secretKey());
  assert.equal(await verifyToken(token), false);
});

test("verifyToken: a missing token is rejected", async () => {
  assert.equal(await verifyToken(undefined), false);
});

test("verifyToken: a token signed with the wrong secret is rejected", async () => {
  const wrongKey = new TextEncoder().encode("a-completely-different-secret");
  const token = await new SignJWT({ board: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(wrongKey);
  assert.equal(await verifyToken(token), false);
});
