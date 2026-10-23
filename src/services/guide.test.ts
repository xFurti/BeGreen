import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTION_LIST } from "@/data/actions";
import { BINS, ITEMS } from "@/data/guide";
import { actionCopy, itemCopy } from "@/i18n/content";
import { translator } from "@/i18n/catalog";
import { guideAction, GUIDE_FEATURED } from "@/services/guide";

test("guide accepts every action link, including the six additional gestures", () => {
  for (const action of ACTION_LIST) assert.equal(guideAction(action.id), action.id);
  assert.equal(guideAction(["plant", "move"]), "plant");
  for (const value of [undefined, [], "missing", "__proto__", "constructor", {}, 0]) {
    assert.equal(guideAction(value), "move");
  }
  assert.equal(new Set([...GUIDE_FEATURED, ...ACTION_LIST.map(a => a.id)]).size, 10);
});

test("material examples use existing objects from the same bin and translate in both languages", () => {
  for (const [bin, data] of Object.entries(BINS)) {
    assert.ok(data.examples.length >= 2);
    for (const id of data.examples) {
      assert.equal(ITEMS.find(item => item.id === id)?.bin, bin);
      for (const language of ["it", "en"] as const) {
        const copy = itemCopy(translator(language), id);
        assert.notEqual(copy.name, id);
        assert.ok(copy.tip.length > 0);
      }
    }
  }
});

test("optional walkthrough retains all original instructions and proof hints for every gesture", () => {
  for (const language of ["it", "en"] as const) {
    for (const action of ACTION_LIST) {
      const copy = actionCopy(translator(language), action.id);
      assert.equal(copy.howto.length, 3);
      assert.ok(copy.howto.every(step => step.length > 0));
      assert.ok(copy.proofHint.length > 0);
    }
  }
});
