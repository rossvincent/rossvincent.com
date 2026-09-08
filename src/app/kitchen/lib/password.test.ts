import { test } from "node:test";
import assert from "node:assert/strict";
import { checkKitchenPassword } from "./password.ts";

const LONG = "a-genuinely-long-kitchen-passphrase";

test("checkKitchenPassword: rejects everything when KITCHEN_PASSWORD is unset", () => {
  const prev = process.env.KITCHEN_PASSWORD;
  delete process.env.KITCHEN_PASSWORD;
  assert.equal(checkKitchenPassword("anything"), false);
  assert.equal(checkKitchenPassword(""), false);
  if (prev !== undefined) process.env.KITCHEN_PASSWORD = prev;
});

test("checkKitchenPassword: rejects a configured password shorter than 20 characters", () => {
  const prev = process.env.KITCHEN_PASSWORD;
  process.env.KITCHEN_PASSWORD = "short-one";
  assert.equal(checkKitchenPassword("short-one"), false);
  if (prev === undefined) delete process.env.KITCHEN_PASSWORD;
  else process.env.KITCHEN_PASSWORD = prev;
});

test("checkKitchenPassword: accepts the right long passphrase and rejects a wrong one", () => {
  const prev = process.env.KITCHEN_PASSWORD;
  process.env.KITCHEN_PASSWORD = LONG;
  assert.equal(checkKitchenPassword(LONG), true);
  assert.equal(checkKitchenPassword(LONG + "x"), false);
  if (prev === undefined) delete process.env.KITCHEN_PASSWORD;
  else process.env.KITCHEN_PASSWORD = prev;
});

test("checkKitchenPassword: a copy-pasted passphrase with stray spaces still works", () => {
  const prev = process.env.KITCHEN_PASSWORD;
  process.env.KITCHEN_PASSWORD = LONG;
  assert.equal(checkKitchenPassword("  " + LONG + " "), true);
  if (prev === undefined) delete process.env.KITCHEN_PASSWORD;
  else process.env.KITCHEN_PASSWORD = prev;
});
