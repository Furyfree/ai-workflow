import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const validate = resolve("skills/validate/run.sh");

// The stand-in reviewer only records that it started; a real one would upload the material.
async function repo(t: TestContext, origin?: string) {
	const root = mkdtempSync(join(tmpdir(), "ai-workflow-validate-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const bin = join(root, "bin");
	mkdirSync(bin);
	writeFileSync(join(bin, "grok"), `#!/bin/sh\necho grok >> '${join(root, "calls")}'\necho LGTM\n`, { mode: 0o700 });
	const env: NodeJS.ProcessEnv = {
		...process.env,
		PATH: `${bin}:${process.env.PATH}`,
		HOME: root,
		TMPDIR: root,
		GIT_CONFIG_NOSYSTEM: "1",
		VALIDATORS: "grok",
	};
	for (const key of ["AI_WORKFLOW_SUBAGENT", "ALLOW_FOREIGN", "ALLOW_SECRETS"]) delete env[key];
	const work = join(root, "work");
	mkdirSync(work);
	await exec("git", ["init", "-q"], { cwd: work, env });
	if (origin) await exec("git", ["remote", "add", "origin", origin], { cwd: work, env });
	writeFileSync(join(work, "change.diff"), "+  return total\n");
	return {
		run: (extra: NodeJS.ProcessEnv = {}) =>
			exec("bash", [validate, "change.diff"], { cwd: work, env: { ...env, ...extra }, timeout: 5000 }),
		started: () => existsSync(join(root, "calls")),
	};
}

test("validate sends nothing to outside reviewers from repositories that are not mine", async (t) => {
	for (const origin of [
		undefined,
		"git@gitlab.com:work/app.git",
		"https://github.com/Furyfreelance/app.git",
		"https://github.com.example/Furyfree/app.git",
	]) {
		const app = await repo(t, origin);
		await assert.rejects(app.run(), { code: 4 }, origin);
		assert.equal(app.started(), false, origin);
	}
});

test("validate sends my repositories, and others only with explicit permission", async (t) => {
	for (const [origin, extra] of [
		["git@github.com:Furyfree/ai-workflow.git", {}],
		["ssh://git@github.com/Furyfree/ai-workflow.git", {}],
		["https://github.com/Furyfree/ai-workflow.git", {}],
		["git@gitlab.com:work/app.git", { ALLOW_FOREIGN: "1" }],
	] as const) {
		const app = await repo(t, origin);
		await app.run(extra);
		assert.equal(app.started(), true, origin);
	}
});
