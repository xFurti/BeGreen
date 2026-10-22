const { test } = require("node:test");
const assert = require("node:assert/strict");
const prepare = require("./prepare-review.cjs");

const pr = {
  number: 7, state: "open", draft: false,
  base: { ref: "main" },
  head: { ref: "feat/demo", sha: "abc123", repo: { full_name: "team/AU" } },
};

function fixture(eventName, payload, permission = "write", currentPr = pr) {
  const outputs = {};
  let readPr = 0;
  return {
    outputs,
    readCount: () => readPr,
    args: {
      context: { eventName, payload, repo: { owner: "team", repo: "AU" } },
      core: { setOutput: (k, v) => { outputs[k] = v; }, notice: () => {} },
      github: { rest: {
        repos: { getCollaboratorPermissionLevel: async () => ({ data: { permission } }) },
        pulls: { get: async () => { readPr++; return { data: currentPr }; } },
      } },
    },
  };
}
const comment = (body, type = "User") => ({
  issue: { number: 7, pull_request: {} }, comment: { body, user: { login: "teammate", type } },
});

test("accetta il comando richiesto e il focus senza interpretarlo", () => {
  assert.deepEqual(prepare.parseCommand("/PI review"), { focus: "" });
  assert.deepEqual(prepare.parseCommand(" /pi review controlla login "), { focus: "controlla login" });
  assert.deepEqual(prepare.parseCommand("/pi review $(echo injected)"), { focus: "$(echo injected)" });
  for (const body of ["/pi fix", "/pi reviewer", "testo /pi review", "/pi review-all"]) {
    assert.equal(prepare.parseCommand(body), null);
  }
});

test("solo un utente con permessi effettivi di scrittura può richiedere la review", async () => {
  for (const permission of ["read", "triage", "none"]) {
    const f = fixture("issue_comment", comment("/PI review"), permission);
    await prepare(f.args);
    assert.equal(f.outputs.run, "false");
    assert.equal(f.readCount(), 0);
  }
  for (const permission of ["write", "maintain", "admin"]) {
    const f = fixture("issue_comment", comment("/PI review"), permission);
    await prepare(f.args);
    assert.equal(f.outputs.run, "true");
    assert.equal(f.outputs.sha, pr.head.sha);
  }
});

test("ignora bot, issue normali e commenti senza comando", async () => {
  for (const payload of [comment("LGTM"), comment("/pi review", "Bot"), {
    ...comment("/pi review"), issue: { number: 7 },
  }]) {
    const f = fixture("issue_comment", payload);
    await prepare(f.args);
    assert.equal(f.outputs.run, "false");
    assert.equal(f.readCount(), 0);
  }
});

test("esclude draft, PR chiuse, fork e altre destinazioni usando lo stato attuale", async () => {
  const rejected = [
    { ...pr, state: "closed" }, { ...pr, draft: true }, { ...pr, base: { ref: "dev" } },
    { ...pr, head: { ...pr.head, repo: { full_name: "outsider/AU" } } },
    { ...pr, head: { ...pr.head, repo: null } },
    { ...pr, head: { ...pr.head, ref: "main" } },
  ];
  for (const current of rejected) {
    const f = fixture("pull_request_target", { action: "opened", pull_request: pr }, "write", current);
    await prepare(f.args);
    assert.equal(f.outputs.run, "false");
  }
});

test("review automatica solo all'apertura o quando il draft diventa pronto", async () => {
  for (const action of ["opened", "ready_for_review", "synchronize", "edited", "reopened"]) {
    const f = fixture("pull_request_target", { action, pull_request: pr });
    await prepare(f.args);
    assert.equal(f.outputs.run, ["opened", "ready_for_review"].includes(action) ? "true" : "false");
  }
});
