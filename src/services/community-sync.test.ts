import assert from "node:assert/strict";
import { test } from "node:test";

import { createCommunitySync } from "./community-sync.ts";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("background synchronization keeps failures handled", async () => {
  const error = new Error("offline");
  const reported: unknown[] = [];
  const sync = createCommunitySync({ refresh: async () => { throw error; }, hasSynced: () => false, onError: (e) => reported.push(e) });
  await sync("verona");
  assert.deepEqual(reported, [error]);
});

test("a visible request rejects even when that community already has cached data", async () => {
  const error = new Error("request failed");
  const sync = createCommunitySync({ refresh: async () => { throw error; }, hasSynced: () => true, onError: () => {} });
  await assert.rejects(sync("verona", { throwOnError: true }), (e) => e === error);
});

test("rankings receive a failure when joining a background request already in flight", async () => {
  const gate = deferred();
  const error = new Error("offline");
  let calls = 0;
  const reported: unknown[] = [];
  const sync = createCommunitySync({ refresh: async () => { calls++; await gate.promise; }, hasSynced: () => true, onError: (e) => reported.push(e) });
  const background = sync();
  const ranking = assert.rejects(sync("verona", { throwOnError: true }), (e) => e === error);
  await Promise.resolve();
  assert.equal(calls, 1);
  gate.reject(error);
  await Promise.all([background, ranking]);
  assert.equal(calls, 1);
  assert.deepEqual(reported, [error]);
});

test("a background caller does not inherit an unhandled rejection from a visible request", async () => {
  const gate = deferred();
  const error = new Error("offline");
  const sync = createCommunitySync({ refresh: () => gate.promise, hasSynced: () => false, onError: () => {} });
  const ranking = assert.rejects(sync("verona", { throwOnError: true }), (e) => e === error);
  const background = sync("verona");
  gate.reject(error);
  await Promise.all([ranking, background]);
});

test("retry starts a fresh request after a failure and can recover", async () => {
  let calls = 0;
  const sync = createCommunitySync({ refresh: async () => { if (++calls === 1) throw new Error("offline"); }, hasSynced: () => false, onError: () => {} });
  await assert.rejects(sync("verona", { throwOnError: true }), /offline/);
  await sync("verona", { throwOnError: true });
  assert.equal(calls, 2);
});

test("a different community is fetched after the shared request if its data is missing", async () => {
  const gate = deferred();
  const fetched = new Set<string>();
  const calls: (string | undefined)[] = [];
  const sync = createCommunitySync({
    refresh: async (id) => { calls.push(id); await gate.promise; if (id) fetched.add(id); },
    hasSynced: (id) => fetched.has(id),
    onError: () => {},
  });
  const city = sync("verona");
  const group = sync("friends", { throwOnError: true });
  gate.resolve();
  await Promise.all([city, group]);
  assert.deepEqual(calls, ["verona", "friends"]);
});
