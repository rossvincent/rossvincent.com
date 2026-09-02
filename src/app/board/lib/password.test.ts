import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPassword, timingSafeEqualStr } from "./password.ts";

test("timingSafeEqualStr: equal strings match", () => {
  assert.equal(timingSafeEqualStr("hello", "hello"), true);
});

test("timingSafeEqualStr: different strings of the same length do not match", () => {
  assert.equal(timingSafeEqualStr("hello", "world"), false);
});

test("timingSafeEqualStr: different lengths do not match, and do not throw", () => {
  assert.doesNotThrow(() => {
    assert.equal(timingSafeEqualStr("short", "a much longer string"), false);
  });
});

test("checkPassword: rejects everything when BOARD_PASSWORD is unset", () => {
  const prev = process.env.BOARD_PASSWORD;
  delete process.env.BOARD_PASSWORD;
  assert.equal(checkPassword("anything"), false);
  if (prev !== undefined) process.env.BOARD_PASSWORD = prev;
});

test("checkPassword: rejects a configured password shorter than 20 characters", () => {
  const prev = process.env.BOARD_PASSWORD;
  process.env.BOARD_PASSWORD = "short";
  assert.equal(checkPassword("short"), false);
  if (prev === undefined) delete process.env.BOARD_PASSWORD;
  else process.env.BOARD_PASSWORD = prev;
});

test("checkPassword: accepts the right long passphrase, rejects a wrong one", () => {
  const prev = process.env.BOARD_PASSWORD;
  process.env.BOARD_PASSWORD = "correct-horse-battery-staple-2026";
  assert.equal(checkPassword("correct-horse-battery-staple-2026"), true);
  assert.equal(checkPassword("wrong-guess-entirely-here-too"), false);
  if (prev === undefined) delete process.env.BOARD_PASSWORD;
  else process.env.BOARD_PASSWORD = prev;
});
