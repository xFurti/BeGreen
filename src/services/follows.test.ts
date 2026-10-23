import assert from "node:assert/strict";
import { test } from "node:test";

import { followingAfterFailedFollow, nextFollowing } from "@/services/follows";

test("a follow puts that account first and an unfollow drops only them", () => {
  assert.deepEqual(nextFollowing(["c"], "b", true), ["b", "c"]);
  assert.deepEqual(nextFollowing(["b", "c"], "b", true), ["b", "c"]);
  assert.deepEqual(nextFollowing(["b", "c"], "b", false), ["c"]);
});

test("a failed follow drops only that account and keeps later ones", () => {
  assert.deepEqual(followingAfterFailedFollow(["c", "b"], "b", true, true), ["c"]);
});

test("a failed unfollow puts only that account back", () => {
  assert.deepEqual(followingAfterFailedFollow(["c"], "b", false, true), ["b", "c"]);
});

test("a newer follow on the same account is left alone when an older request fails", () => {
  assert.equal(followingAfterFailedFollow(["b", "c"], "b", true, false), null);
});
