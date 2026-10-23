import assert from "node:assert/strict";
import { test } from "node:test";
import { growthOf, handleVariants, isSeedId, moodFromGround, moodFromStreak, plantStage, SEED_IDS, seedOf, STAGE_AT } from "../src/data/seeds.ts";

test("the first Seeds make the seed sprout, then it grows by thresholds and never shrinks", () => {
  assert.equal(plantStage(0), 0);
  assert.equal(plantStage(1), 1);
  assert.equal(plantStage(59), 1);
  assert.equal(plantStage(60), 2);
  assert.equal(plantStage(200), 3);
  assert.equal(plantStage(499), 3);
  assert.equal(plantStage(500), 4);
  assert.equal(plantStage(99999), 4);
  assert.equal(plantStage(-5), 0);
  let last = 0;
  for (let s = 0; s <= 700; s += 7) {
    assert.ok(plantStage(s) >= last);
    last = plantStage(s);
  }
  assert.equal(STAGE_AT.length, 5);
});

test("growth tells how far the next stage is", () => {
  assert.deepEqual(growthOf(0), { stage: 0, id: "seed", seeds: 0, next: 1, toNext: 1, progress: 0 });
  const g = growthOf(130);
  assert.equal(g.id, "seedling");
  assert.equal(g.next, 200);
  assert.equal(g.toNext, 70);
  assert.equal(g.progress, 0.5);
  assert.deepEqual(growthOf(800), { stage: 4, id: "bloom", seeds: 800, next: undefined, toNext: 0, progress: 1 });
});

test("everyone has a seed: the chosen one, or a stable one from the id", () => {
  assert.equal(seedOf("x", "lavender"), "lavender");
  assert.equal(seedOf("user-1", "cactus"), seedOf("user-1"));
  assert.equal(seedOf("user-1"), seedOf("user-1", null));
  assert.ok(isSeedId(seedOf("someone-else")));
  const spread = new Set(Array.from({ length: 60 }, (_, i) => seedOf(`id-${i}`)));
  assert.ok(spread.size >= 4, "derived seeds vary between people");
  assert.equal(SEED_IDS.length, 6);
});

test("the buddy reacts to the ground: bad air first, then dry soil", () => {
  assert.equal(moodFromGround({ aqi: 75, dryDays: 9, rain7: 0 }), "cough");
  assert.equal(moodFromGround({ aqi: 30, dryDays: 6, rain7: 0.5 }), "thirsty");
  assert.equal(moodFromGround({ aqi: 30, moisture: 0.08 }), "thirsty");
  assert.equal(moodFromGround({ aqi: 30, dryDays: 6, rain7: 12, moisture: 0.3 }), "happy");
  assert.equal(moodFromGround({}), "happy");
});

test("a broken streak makes a grown plant thirsty, never a new seed", () => {
  assert.equal(moodFromStreak(0, 0), "happy");
  assert.equal(moodFromStreak(40, 0), "thirsty");
  assert.equal(moodFromStreak(40, 2), "happy");
});

test("taken handles get valid, different alternatives", () => {
  const v = handleVariants("giulia", "Giulia Dal Pra");
  assert.ok(v.length >= 3);
  assert.ok(v.includes("giulia.pra"));
  assert.ok(v.every((h) => /^[a-z0-9._]{2,24}$/.test(h) && h !== "giulia"));
  assert.ok(handleVariants("a_very_long_handle_name_x").every((h) => h.length <= 24));
});
