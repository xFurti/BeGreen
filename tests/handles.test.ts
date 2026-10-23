import assert from "node:assert/strict";
import { test } from "node:test";

import { handleVariants, isHandle, toHandle } from "../src/services/handles.ts";

test("toHandle normalizes accents, uppercase letters, and spaces", () => {
  assert.equal(toHandle("  Àda Loveláçë  "), "adalovelace");
});

test("isHandle rejects empty, one-character, and uppercase handles", () => {
  assert.equal(isHandle(""), false);
  assert.equal(isHandle("a"), false);
  assert.equal(isHandle("Ada"), false);
  assert.equal(isHandle("ada_26"), true);
});

test("handleVariants only returns valid, unique alternatives", () => {
  for (const base of ["ada", "abcdefghijklmnopqrstuvwx"]) {
    const variants = handleVariants(base);
    assert.ok(variants.length <= 5);
    assert.equal(new Set(variants).size, variants.length);
    assert.ok(!variants.includes(base));
    assert.ok(variants.every((variant) => isHandle(variant) && variant.length <= 24));
  }
});
