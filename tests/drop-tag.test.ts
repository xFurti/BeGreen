import assert from "node:assert/strict";
import { test } from "node:test";
import { isCurrentDrop } from "../src/services/drop-tag.ts";

test("only today's shared challenge and demo proofs open today's sheet", () => {
  const today = "verona:2026-10-23";
  assert.equal(isCurrentDrop({ challengeId: today }, today), true);
  assert.equal(isCurrentDrop({ isDemo: true }, today), true);
  assert.equal(isCurrentDrop({ challengeId: "verona:2026-10-22" }, today), false);
  assert.equal(isCurrentDrop({ challengeId: "schio:2026-10-23" }, today), false);
  assert.equal(isCurrentDrop({}, today), false);
});
