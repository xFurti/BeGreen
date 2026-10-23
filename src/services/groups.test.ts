import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Post, Squad } from "@/data/types";
import { assertDestination, groupPosts, isGroupPost, legacyGroupId, localSquadGroup, postGroupId } from "@/services/groups";

const post = (id: string, extra: Partial<Post> = {}): Post => ({
  id, authorId: "me", action: "move", photo: "p", proof: "v", caption: "", place: "", createdAt: 1,
  verifiedBy: [], reactions: {}, comments: [], audience: "public", ...extra,
});

describe("explicit group destinations", () => {
  it("uses the destination, not the author's membership, and keeps legacy proofs", () => {
    const posts = [
      post("public"), post("mine", { audience: "group", groupId: "friends" }),
      post("elsewhere", { audience: "group", groupId: "other" }),
      post("blocked", { audience: "group", groupId: "friends", authorId: "blocked" }),
      post("demo", { audience: "group", groupId: "friends", isDemo: true }),
      post("legacy", { audience: "squad", squadId: "old" }),
    ];
    assert.deepEqual(groupPosts(posts, "friends", ["blocked"]).map((p) => p.id), ["mine"]);
    assert.deepEqual(groupPosts(posts, legacyGroupId("old")).map((p) => p.id), ["legacy"]);
    assert.equal(isGroupPost(posts[5]), true);
    assert.equal(postGroupId({ groupId: "new", squadId: "old" }), "new");
  });

  it("never silently falls back to a public audience", () => {
    assert.throws(() => assertDestination("group", undefined, []));
    assert.throws(() => assertDestination("group", "left", ["joined"]));
    assert.throws(() => assertDestination("public", "joined", ["joined"]));
    assert.doesNotThrow(() => assertDestination("group", "joined", ["joined"]));
    assert.doesNotThrow(() => assertDestination("comune", undefined, []));
  });

  it("preserves local squad identity, progress and impact without creating public groups", () => {
    const squad: Squad = {
      id: "local-old", name: "Our class", kind: "class", place: "Schio", comuneId: "schio",
      memberIds: ["me", "friend"], memberCount: 2, code: "CLASS42", points: 50,
      quest: { title: "Cycle", action: "move", goal: 10, progress: 3, endsInDays: 4 },
      monthly: { move: 3 },
    };
    const now = Date.UTC(2026, 9, 23);
    const { community, progress } = localSquadGroup(squad, { id: "schio", name: "Schio", lat: 45.7, lon: 11.3 }, now);
    assert.equal(community.id, "squad:local-old");
    assert.equal(community.visibility, "private");
    assert.equal(community.kind, "school");
    assert.equal(progress.quest?.progress, 3);
    assert.equal(progress.points, 50);
    assert.deepEqual(progress.months["2026-10"], { move: 3 });
    assert.equal(squad.code, "CLASS42");
  });
});
