const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createReviewFileReader, MAX_FILE_BYTES } = require("./read-review-file.cjs");

const sha = "a".repeat(40);
const config = { repository: "team/BeGreen", sha, token: "test-token" };
const fileResponse = (text, overrides = {}) => ({
  ok: true,
  json: async () => ({ type: "file", encoding: "base64", size: Buffer.byteLength(text),
    content: Buffer.from(text).toString("base64"), ...overrides }),
});

test("legge solo la repository e lo SHA fissati, senza seguire redirect", async () => {
  let request;
  const reader = createReviewFileReader({ ...config, fetch: async (...args) => {
    request = args;
    return fileResponse("export const value = 1;\n");
  } });
  const signal = new AbortController().signal;
  const result = await reader({ path: "src/app/(tabs)/me.tsx", sha: "main", repository: "other/repo" }, signal);
  assert.equal(request[0], `https://api.github.com/repos/team/BeGreen/contents/src/app/(tabs)/me.tsx?ref=${sha}`);
  assert.equal(request[1].redirect, "error");
  assert.equal(request[1].signal, signal);
  assert.equal(request[1].headers.Authorization, "Bearer test-token");
  assert.equal(result.sha, sha);
  assert.equal(result.text, "1: export const value = 1;");
});

test("pagina senza nascondere il contesto rimasto", async () => {
  const reader = createReviewFileReader({ ...config, fetch: async () => fileResponse("uno\r\ndue\r\ntre\r\n") });
  const first = await reader({ path: "file.ts", maxLines: 2 });
  assert.deepEqual(first, { path: "file.ts", sha, totalLines: 3, text: "1: uno\n2: due", truncated: true, nextLine: 3 });
  const last = await reader({ path: "file.ts", startLine: first.nextLine, maxLines: 2 });
  assert.equal(last.text, "3: tre");
  assert.equal(last.truncated, false);
  assert.equal(last.nextLine, null);
});

test("rifiuta percorsi esterni e limiti invalidi prima di chiamare GitHub", async () => {
  const reader = createReviewFileReader({ ...config, fetch: async () => assert.fail("Unexpected request") });
  for (const path of ["", "../secret", "src/../../secret", "/etc/passwd", "C:\\secret", "a//b", "a/./b", "bad\npath"]) {
    await assert.rejects(reader({ path }), /relative repository file path/);
  }
  for (const params of [{ startLine: 0 }, { startLine: 1.5 }, { maxLines: 0 }, { maxLines: 301 }]) {
    await assert.rejects(reader({ path: "file.ts", ...params }), /startLine/);
  }
});

test("rifiuta directory, submodule, file grandi e contenuti non testuali", async () => {
  for (const response of [
    fileResponse("", { type: "dir" }), fileResponse("", { submodule_git_url: "https://example.com" }),
    fileResponse("", { encoding: "none" }), fileResponse("", { size: MAX_FILE_BYTES + 1 }),
    fileResponse("a\0b"), fileResponse("", { content: Buffer.from([0xff]).toString("base64") }),
    fileResponse("", { size: 1, content: Buffer.alloc(MAX_FILE_BYTES + 1, 97).toString("base64") }),
  ]) {
    const reader = createReviewFileReader({ ...config, fetch: async () => response });
    await assert.rejects(reader({ path: "file.ts" }));
  }
});

test("i fallimenti GitHub restano espliciti e non espongono il body della risposta", async () => {
  for (const status of [403, 404]) {
    const reader = createReviewFileReader({ ...config, fetch: async () => ({ ok: false, status,
      json: async () => assert.fail("Do not echo API error payloads") }) });
    await assert.rejects(reader({ path: "file.ts" }), new RegExp(`GitHub HTTP ${status}`));
  }
});

test("una configurazione non fissata a un commit viene rifiutata", () => {
  for (const overrides of [{ repository: "../other" }, { sha: "main" }, { token: "" }]) {
    assert.throws(() => createReviewFileReader({ ...config, ...overrides }), /fixed review/);
  }
});
