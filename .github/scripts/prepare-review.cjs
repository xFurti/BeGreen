const writable = new Set(["write", "maintain", "admin"]);

function parseCommand(body) {
  const match = /^\/pi[ \t]+review(?:[ \t]+([\s\S]*))?$/i.exec((body ?? "").trim());
  return match ? { focus: (match[1] ?? "").trim().slice(0, 3000) } : null;
}

function eligible(pr, repository) {
  return pr.state === "open" && !pr.draft && pr.base.ref === "main" &&
    pr.head.ref !== "main" && pr.head.repo?.full_name === repository;
}

async function prepare({ github, context, core }) {
  core.setOutput("run", "false");
  let number;
  let focus = "";
  if (context.eventName === "issue_comment") {
    const { issue, comment } = context.payload;
    const command = parseCommand(comment?.body);
    if (!issue?.pull_request || !command || comment?.user?.type !== "User") return;
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
      ...context.repo, username: comment.user.login,
    });
    if (!writable.has(data.permission)) {
      core.notice("Review ignorata: l'autore non ha permessi di scrittura.");
      return;
    }
    number = issue.number;
    focus = command.focus;
  } else if (context.eventName === "pull_request_target" &&
      ["opened", "ready_for_review", "synchronize"].includes(context.payload.action)) {
    number = context.payload.pull_request.number;
  } else {
    return;
  }
  const { data: pr } = await github.rest.pulls.get({ ...context.repo, pull_number: number });
  if (!eligible(pr, `${context.repo.owner}/${context.repo.repo}`)) {
    core.notice("Review ignorata: serve una PR interna, aperta, pronta e verso main.");
    return;
  }
  core.setOutput("number", String(pr.number));
  core.setOutput("sha", pr.head.sha);
  core.setOutput("focus", focus);
  core.setOutput("run", "true");
}

module.exports = prepare;
module.exports.parseCommand = parseCommand;
module.exports.eligible = eligible;
