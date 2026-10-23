import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIONS } from "../src/data/actions.ts";
import type { Post } from "../src/data/types.ts";
import { canClaimDrop, isChallengeDuplicate, publishWithReward, seedsFor } from "../src/services/rewards.ts";

const day = "2026-10-23";
const now = new Date(2026, 9, 23, 12);
const drop = { id: `verona:${day}`, day, shared: true };
const proof: Post = {
  id: "local-1", authorId: "me", action: "refill", photo: "photo", proof: "video",
  caption: "Refill", place: "Verona", createdAt: now.getTime(), verifiedBy: [], reactions: {}, comments: [],
  audience: "comune", challengeId: drop.id, isDrop: true,
};

test("Refill, Sort and Car-free use the same base plus one Drop bonus", () => {
  for (const [action, base, total] of [["refill", 10, 20], ["sort", 10, 20], ["move", 20, 30]] as const) {
    assert.equal(ACTIONS[action].seeds, base);
    assert.equal(seedsFor({ action }), base);
    assert.equal(seedsFor({ action, isDrop: true }), total);
    assert.equal(seedsFor({ action, challengeId: drop.id }), total);
    assert.equal(seedsFor({ action, isDrop: true, challengeId: drop.id }), total);
  }
});

test("only an available challenge today may advertise the bonus", () => {
  assert.equal(canClaimDrop(drop, [], "me", true, now), true);
  assert.equal(canClaimDrop(drop, [proof], "me", true, now), false);
  assert.equal(canClaimDrop(drop, [{ ...proof, authorId: "other" }], "me", true, now), true);
  assert.equal(canClaimDrop({ ...drop, day: "2026-10-22" }, [], "me", true, now), false);
  assert.equal(canClaimDrop({ ...drop, offline: true }, [], "me", true, now), false);
  assert.equal(canClaimDrop({ ...drop, shared: false }, [], "me", true, now), false);
  assert.equal(canClaimDrop({ ...drop, shared: false }, [], "me", false, now), true);
});

test("a successful publish preserves the challenge and the promised 20 Seeds", async () => {
  const saved = await publishWithReward(proof, async (p) => ({ ...p, id: "server-1", pending: false }), () => assert.fail("not a duplicate"));
  assert.equal(saved.challengeId, drop.id);
  assert.equal(saved.pending, false);
  assert.equal(seedsFor(saved), 20);
});

test("a challenge claimed on another device explicitly becomes a regular proof once", async () => {
  const calls: Post[] = [];
  let notices = 0;
  const saved = await publishWithReward(proof, async (p) => {
    calls.push(p);
    if (calls.length === 1) throw { code: "23505", message: 'duplicate key violates unique constraint "posts_one_per_challenge"' };
    return { ...p, id: "server-2", pending: false };
  }, (regular) => { notices++; assert.equal(seedsFor(regular), 10); });
  assert.equal(notices, 1);
  assert.equal(calls.length, 2);
  assert.equal(saved.challengeId, undefined);
  assert.equal(saved.isDrop, false);
  assert.equal(seedsFor(saved), 10);
  assert.equal(seedsFor(proof), 20); // never mutate the original optimistic object
});

test("network errors and other unique constraints never strip a promised bonus", async () => {
  for (const error of [new Error("offline"), { code: "23505", message: "posts_pkey" }]) {
    assert.equal(isChallengeDuplicate(error), false);
    let calls = 0;
    await assert.rejects(publishWithReward(proof, async () => { calls++; throw error; }, () => assert.fail("not a challenge collision")));
    assert.equal(calls, 1);
    assert.equal(proof.challengeId, drop.id);
  }
});
