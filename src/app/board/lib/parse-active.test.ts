import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { parseActive } from "./parse-active.ts";

// Faithfulness check: the whole point of this port is that it behaves like
// scripts/board-build.py, which is the tested, in-production reference.
// This reads the real current ACTIVE.md from the sibling ClaudeOS repo and
// compares this module's output against that script's own --print output.
// Skips itself gracefully if that repo or python3 isn't available (e.g. a
// future CI environment), rather than failing on an environment gap.

const CLAUDEOS = path.join(homedir(), "ClaudeOS");
const ACTIVE_PATH = path.join(CLAUDEOS, "ACTIVE.md");
const SCRIPT_PATH = path.join(CLAUDEOS, "scripts", "board-build.py");

const canRun = existsSync(ACTIVE_PATH) && existsSync(SCRIPT_PATH);

test(
  "parseActive matches scripts/board-build.py's real output",
  { skip: !canRun && "ClaudeOS repo not found alongside this one" },
  () => {
    const text = readFileSync(ACTIVE_PATH, "utf8");
    const ours = parseActive(text, new Date());

    const pyOut = execFileSync("python3", [SCRIPT_PATH, "--print"], {
      encoding: "utf8",
    });
    const jsonStart = pyOut.indexOf("{");
    const jsonEnd = pyOut.lastIndexOf("}") + 1;
    const py = JSON.parse(pyOut.slice(jsonStart, jsonEnd));

    assert.equal(ours.gate.title, py.gate.title);
    assert.equal(ours.gate.when, py.gate.when);
    assert.deepEqual(ours.gate.steps, py.gate.steps);

    assert.deepEqual(
      ours.zones.map((z) => z.items.length),
      py.zones.map((z: { items: unknown[] }) => z.items.length)
    );

    // Full spot-check on the first NOW row, rather than a blind deep-equal
    // of everything - the row content is what matters, not chasing exact
    // whitespace parity on fields neither implementation displays raw.
    assert.deepEqual(ours.zones[0].items[0], py.zones[0].items[0]);
  }
);
