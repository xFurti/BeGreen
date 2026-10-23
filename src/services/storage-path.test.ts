import assert from "node:assert/strict";
import { test } from "node:test";
import { proofPath } from "@/services/storage-path";

test("storage references support existing media without trusting other origins or storing signed query strings", () => {
  const origin = "https://project.supabase.co";
  assert.equal(proofPath("storage:proofs/me/p.jpg", origin), "me/p.jpg");
  assert.equal(proofPath(`${origin}/storage/v1/object/public/proofs/me/p.jpg`, origin), "me/p.jpg");
  assert.equal(proofPath(`${origin}/storage/v1/object/sign/proofs/me/p.jpg?token=example`, origin), "me/p.jpg");
  assert.equal(proofPath("https://elsewhere.test/storage/v1/object/public/proofs/me/p.jpg", origin), null);
  assert.equal(proofPath("asset:move.photo.0", origin), null);
});
