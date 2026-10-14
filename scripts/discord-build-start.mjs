import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function commitsSince({
  baseSha,
  sha,
  repoUrl,
  runGit = execFileSync,
}) {
  if (!baseSha) return [];

  try {
    runGit("git", ["merge-base", "--is-ancestor", baseSha, sha], {
      stdio: "ignore",
    });
    const output = runGit(
      "git",
      ["log", "--reverse", "--format=%H%x00%s", `${baseSha}..${sha}`],
      { encoding: "utf8" },
    );

    return String(output)
      .trimEnd()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [id, message] = line.split("\0", 2);
        return { id, message, url: `${repoUrl}/commit/${id}` };
      });
  } catch {
    return [];
  }
}

function splitCommitFields(lines) {
  const chunks = [];
  for (const line of lines) {
    const safeLine = line.slice(0, 1024);
    const previous = chunks.at(-1);
    if (!previous || previous.length + safeLine.length + 1 > 1024) {
      chunks.push(safeLine);
    } else {
      chunks[chunks.length - 1] = `${previous}\n${safeLine}`;
    }
  }
  // ponytail: Discord caps an embed at 6,000 characters. Split webhook
  // messages only if failed-build chains ever approach that limit.
  return chunks;
}

export function buildDiscordBuildStartedPayload({
  project,
  actor,
  sha,
  repoUrl,
  runUrl,
  event,
  commits = [],
}) {
  const commitList = commits.length
    ? commits
    : event.commits?.length
      ? event.commits
      : [{ id: sha, message: "", url: `${repoUrl}/commit/${sha}` }];
  const commitValues = splitCommitFields(
    commitList.map(({ id, message, url }) => {
      const subject = message?.split("\n", 1)[0];
      return `[${id.slice(0, 7)}](${url})${subject ? ` — ${subject}` : ""}`;
    }),
  );

  return {
    embeds: [
      {
        title: "🏗️ Build started",
        description: "GitHub is verifying the production build.",
        color: 3447003,
        fields: [
          { name: "Project", value: project, inline: true },
          ...commitValues.map((value, index) => ({
            name: index === 0 ? "Commits" : "Commits (continued)",
            value,
          })),
          { name: "Actor", value: actor, inline: true },
          { name: "Action", value: `[view run](${runUrl})`, inline: true },
        ],
      },
    ],
  };
}

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const repoUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
  const commits = commitsSince({
    baseSha: process.env.LAST_SUCCESS_SHA,
    sha: process.env.GITHUB_SHA,
    repoUrl,
  });
  const payload = buildDiscordBuildStartedPayload({
    project: process.env.PROJECT,
    actor: process.env.GITHUB_ACTOR,
    sha: process.env.GITHUB_SHA,
    repoUrl,
    runUrl: `${repoUrl}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    event,
    commits,
  });
  console.log(JSON.stringify(payload));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
