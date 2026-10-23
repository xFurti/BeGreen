import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyPublishError, UploadError, withAuthRetry } from "../src/services/publish-errors.ts";

test("only identifiable network failures use the offline message", () => {
  for (const error of [new TypeError("Failed to fetch"), new TypeError("Network request failed"), { name: "AbortError" }, { code: "ENOTFOUND" }, { cause: { code: "ETIMEDOUT" } }]) {
    assert.equal(classifyPublishError(error), "offline");
  }
  assert.equal(classifyPublishError(new TypeError("Cannot read properties of undefined")), "server");
  assert.equal(classifyPublishError({ code: "42501", message: "new row violates row-level security policy" }), "server");
  assert.equal(classifyPublishError({ status: 503, message: "database unavailable" }), "server");
});

test("auth and failed media uploads are distinct from offline and database errors", () => {
  for (const error of [new Error("No session"), { status: 401 }, { code: "PGRST301" }, new UploadError("Upload failed", 401)]) {
    assert.equal(classifyPublishError(error), "auth");
  }
  assert.equal(classifyPublishError(new UploadError("File missing")), "upload");
  assert.equal(classifyPublishError(new UploadError("Upload failed", 403)), "upload");
  assert.equal(classifyPublishError({ name: "StorageApiError", statusCode: "500" }), "upload");
});

test("an expired session is renewed once before retrying the same proof", async () => {
  let sends = 0;
  let renewals = 0;
  const result = await withAuthRetry(async () => {
    if (++sends === 1) throw { status: 401 };
    return "published";
  }, async () => { renewals++; });
  assert.equal(result, "published");
  assert.equal(sends, 2);
  assert.equal(renewals, 1);
});

test("permanent auth failures stop after one retry; server and network errors do not renew auth", async () => {
  let sends = 0;
  let renewals = 0;
  await assert.rejects(withAuthRetry(async () => { sends++; throw { status: 401 }; }, async () => { renewals++; }));
  assert.equal(sends, 2);
  assert.equal(renewals, 1);
  for (const error of [new TypeError("Failed to fetch"), { code: "42501" }]) {
    let count = 0;
    await assert.rejects(withAuthRetry(async () => { count++; throw error; }, async () => assert.fail("not an auth error")));
    assert.equal(count, 1);
  }
});
