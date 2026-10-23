const MAX_FILE_BYTES = 200_000;
const MAX_LINES = 300;

function createReviewFileReader({ repository, sha, token, fetch: fetchFile = globalThis.fetch }) {
  if (typeof repository !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
      repository.split("/").some(part => part === "." || part === "..") ||
      !/^[a-f\d]{40}$/i.test(sha ?? "") || !token) {
    throw new Error("Missing or invalid fixed review repository, SHA or GitHub token.");
  }

  return async function readReviewFile({ path, startLine = 1, maxLines = 200 }, signal) {
    if (typeof path !== "string" || !path || /[\\\x00-\x1f\x7f]/.test(path) ||
        path.split("/").some(part => !part || part === "." || part === "..")) {
      throw new Error("Use a relative repository file path without traversal.");
    }
    if (!Number.isSafeInteger(startLine) || startLine < 1 ||
        !Number.isSafeInteger(maxLines) || maxLines < 1 || maxLines > MAX_LINES) {
      throw new Error(`startLine must be positive; maxLines must be between 1 and ${MAX_LINES}.`);
    }
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetchFile(
      `https://api.github.com/repos/${repository}/contents/${encodedPath}?ref=${sha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal,
      },
    );
    if (!response.ok) {
      throw new Error(`Cannot read the file at the fixed review SHA (GitHub HTTP ${response.status}).`);
    }
    const file = await response.json();
    if (file.type !== "file" || file.submodule_git_url || file.encoding !== "base64" ||
        typeof file.content !== "string") {
      throw new Error("Only regular text files with inline content can be read.");
    }
    if (file.size > MAX_FILE_BYTES || file.content.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 10_000) {
      throw new Error(`File exceeds the ${MAX_FILE_BYTES}-byte review context limit.`);
    }
    const bytes = Buffer.from(file.content, "base64");
    if (bytes.length > MAX_FILE_BYTES || bytes.includes(0)) {
      throw new Error("File is binary or exceeds the review context limit.");
    }
    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("File is not UTF-8 text.");
    }
    const lines = source.split(/\r?\n/);
    if (lines.at(-1) === "") lines.pop();
    const end = Math.min(startLine - 1 + maxLines, lines.length);
    return {
      path, sha, totalLines: lines.length,
      truncated: end < lines.length,
      nextLine: end < lines.length ? end + 1 : null,
      text: lines.slice(startLine - 1, end).map((line, index) => `${startLine + index}: ${line}`).join("\n"),
    };
  };
}

module.exports = { createReviewFileReader, MAX_FILE_BYTES, MAX_LINES };
