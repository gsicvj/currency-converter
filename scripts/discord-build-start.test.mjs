import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordBuildStartedPayload,
  commitsSince,
} from "./discord-build-start.mjs";

test("shows carried commits, actor, and workflow action", () => {
  const runGit = (_command, args) => {
    if (args[0] === "merge-base") return "";
    return "1111111aaa\0Add work\n2222222bbb\0Fix work\n";
  };
  const repoUrl = "https://github.com/example/currency-converter";
  const commits = commitsSince({
    baseSha: "previous-success",
    sha: "2222222bbb",
    repoUrl,
    runGit,
  });
  const payload = buildDiscordBuildStartedPayload({
    project: "currency-converter",
    actor: "octocat",
    sha: "2222222bbb",
    repoUrl,
    runUrl: `${repoUrl}/actions/runs/123`,
    event: {},
    commits,
  });

  assert.deepEqual(
    payload.embeds[0].fields.map(({ name }) => name),
    ["Project", "Commits", "Actor", "Action"],
  );
  assert.match(payload.embeds[0].fields[1].value, /Add work/);
  assert.match(payload.embeds[0].fields[1].value, /Fix work/);
  assert.equal(payload.embeds[0].fields[2].value, "octocat");
  assert.equal(
    payload.embeds[0].fields[3].value,
    `[view run](${repoUrl}/actions/runs/123)`,
  );
});

test("keeps Discord commit fields within the API limit", () => {
  const commits = Array.from({ length: 8 }, (_, index) => ({
    id: `${index}`.repeat(40),
    message: `Commit ${index}: ${"detail ".repeat(12)}`,
    url: `https://github.com/example/currency-converter/commit/${index}`,
  }));
  const payload = buildDiscordBuildStartedPayload({
    project: "currency-converter",
    actor: "octocat",
    sha: commits.at(-1).id,
    repoUrl: "https://github.com/example/currency-converter",
    runUrl: "https://github.com/example/currency-converter/actions/runs/124",
    event: {},
    commits,
  });

  const commitFields = payload.embeds[0].fields.filter(({ name }) =>
    name.startsWith("Commits"),
  );
  assert.ok(commitFields.length > 1);
  assert.ok(commitFields.every(({ value }) => value.length <= 1024));
});
