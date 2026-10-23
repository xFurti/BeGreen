import assert from "node:assert/strict";
import { test } from "node:test";

import { fitWithin, preferLocal } from "../src/services/media-pure.ts";

test("fitWithin scales oversized photos to the long-side limit", () => {
  assert.deepEqual(fitWithin(2448, 3264), { width: 960, height: 1280 });
  assert.deepEqual(fitWithin(3264, 2448), { width: 1280, height: 960 });
  assert.equal(fitWithin(1000, 800), null);
  assert.equal(fitWithin(1280, 1280), null);
  assert.deepEqual(fitWithin(4000, 1000), { width: 1280, height: 320 });
});

test("preferLocal only replaces media confirmed by the local file check", () => {
  const posts = [
    { id: "one", photo: "https://example.com/one.jpg", proof: "https://example.com/one.mp4" },
    { id: "two", photo: "https://example.com/two.jpg", proof: "https://example.com/two.mp4" },
  ];
  const local = {
    one: { photo: "file:///one.jpg", proof: "file:///one.mp4" },
  };
  const exists = (m: string | undefined) => (typeof m === "string" && m.startsWith("file:") ? m : null);

  const out = preferLocal(posts, local, exists);
  assert.equal(out[0]?.photo, "file:///one.jpg");
  assert.equal(out[0]?.proof, "file:///one.mp4");
  assert.equal(out[1], posts[1]);
  assert.equal(preferLocal(posts, local, () => null)[0], posts[0]);

  const photoOnly = preferLocal([posts[0]!], { one: { photo: "file:///one.jpg" } }, exists);
  assert.equal(photoOnly[0]?.photo, "file:///one.jpg");
  assert.equal(photoOnly[0]?.proof, posts[0]?.proof);
});
