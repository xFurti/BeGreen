import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { BADGE_IDS, BADGES, earnedBadges, isBadgeId } from "../src/data/badges.ts";

test("zero stats earn no badges", () => {
  assert.deepEqual(earnedBadges({ posts: 0, streak: 0, carFree: 0, spotted: false, verified: 0, goals: 0 }), []);
});

test("first proof and spotter are earned independently", () => {
  assert.deepEqual(earnedBadges({ posts: 1, streak: 0, carFree: 0, spotted: true, verified: 0, goals: 2 }), ["first-proof", "spotter"]);
});

test("counted badges use their exact thresholds", () => {
  const base = { posts: 0, streak: 0, carFree: 0, spotted: false, verified: 0, goals: 0 };
  assert.equal(earnedBadges({ ...base, streak: 6 }).includes("streak-7"), false);
  assert.equal(earnedBadges({ ...base, streak: 7 }).includes("streak-7"), true);
  assert.equal(earnedBadges({ ...base, carFree: 4 }).includes("car-free-5"), false);
  assert.equal(earnedBadges({ ...base, carFree: 5 }).includes("car-free-5"), true);
  assert.equal(earnedBadges({ ...base, verified: 9 }).includes("verifier-10"), false);
  assert.equal(earnedBadges({ ...base, verified: 10 }).includes("verifier-10"), true);
  assert.equal(earnedBadges({ ...base, goals: 9 }).includes("goals-10"), false);
  assert.equal(earnedBadges({ ...base, goals: 10 }).includes("goals-10"), true);
});

test("progress exposes current value and goal", () => {
  const badge = BADGES.find((b) => b.id === "car-free-5");
  assert.ok(badge?.progress);
  assert.equal(badge.progress.of({ posts: 0, streak: 0, carFree: 2, spotted: false, verified: 0, goals: 0 }), 2);
  assert.equal(badge.progress.goal, 5);
});

test("badge ids are runtime validated and catalog-aligned", () => {
  assert.equal(isBadgeId("spotter"), true);
  assert.equal(isBadgeId("legend"), false);
  assert.equal(isBadgeId(null), false);
  assert.equal(BADGE_IDS.length, 6);
  assert.deepEqual(BADGES.map((b) => b.id), BADGE_IDS);
});

test("database check contains every client badge id", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261024000000_profile_badge.sql", import.meta.url), "utf8");
  for (const id of BADGE_IDS) assert.match(migration, new RegExp(`'${id}'`));
});
