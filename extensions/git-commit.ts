import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { complete, type UserMessage } from "@earendil-works/pi-ai";
import type { ExecResult, ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const DIFF_LIMIT = 120_000;

interface CommandOptions {
	all: boolean;
	context: string;
}

interface PushTarget {
	remote: string;
	args: string[];
	description: string;
	hasUpstream: boolean;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripFlag(args: string, flag: string): { found: boolean; rest: string } {
	const pattern = new RegExp(`(^|\\s)${escapeRegExp(flag)}(?=\\s|$)`, "g");
	let found = false;
	const rest = args
		.replace(pattern, (match, prefix) => {
			found = true;
			return prefix ? " " : "";
		})
		.replace(/\s+/g, " ")
		.trim();
	return { found, rest };
}

function parseCommitArgs(args: string): CommandOptions {
	const parsed = stripFlag(args.trim(), "--all");
	return { all: parsed.found, context: parsed.rest };
}

function truncateMiddle(text: string, limit = DIFF_LIMIT): string {
	if (text.length <= limit) return text;
	const headLength = Math.floor(limit * 0.75);
	const tailLength = limit - headLength;
	return `${text.slice(0, headLength)}\n\n[... diff truncated: ${text.length - limit} characters omitted ...]\n\n${text.slice(-tailLength)}`;
}

function textContent(response: { content: Array<{ type: string; text?: string }> }): string {
	return response.content
		.filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
}

function shortenSubject(subject: string): string {
	if (subject.length <= 72) return subject;
	const cut = subject.slice(0, 72);
	const lastSpace = cut.lastIndexOf(" ");
	return `${(lastSpace >= 50 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}

function sanitizeCommitMessage(raw: string): string {
	let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
	text = text.replace(/^```(?:gitcommit|text|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
	text = text.replace(/^(commit message|message):\s*/i, "").trim();

	const lines = text
		.split("\n")
		.map((line) => line.replace(/\s+$/g, ""))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.split("\n");

	let subject = (lines.shift() ?? "").trim().replace(/^[-*]\s+/, "");
	subject = subject.replace(/^['"]|['"]$/g, "");
	if (!subject) subject = "Update project files";
	subject = shortenSubject(subject);

	const body = lines.join("\n").trim();
	return body ? `${subject}\n\n${body}` : subject;
}

async function git(pi: ExtensionAPI, cwd: string, args: string[], timeout = 30_000): Promise<ExecResult> {
	return pi.exec("git", args, { cwd, timeout });
}

async function gitOk(pi: ExtensionAPI, cwd: string, args: string[], timeout?: number): Promise<ExecResult> {
	const result = await git(pi, cwd, args, timeout);
	if (result.code !== 0) {
		const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
		throw new Error(output || `git ${args.join(" ")} failed with exit code ${result.code}`);
	}
	return result;
}

async function optionalGit(pi: ExtensionAPI, cwd: string, args: string[], timeout?: number): Promise<string | undefined> {
	const result = await git(pi, cwd, args, timeout);
	if (result.code !== 0) return undefined;
	const value = result.stdout.trim();
	return value || undefined;
}

async function ensureRepository(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<string | undefined> {
	const inside = await git(pi, ctx.cwd, ["rev-parse", "--is-inside-work-tree"]);
	if (inside.code !== 0 || inside.stdout.trim() !== "true") {
		report(pi, ctx, "Not inside a git work tree.", "error");
		return undefined;
	}
	const root = await gitOk(pi, ctx.cwd, ["rev-parse", "--show-toplevel"]);
	return root.stdout.trim() || ctx.cwd;
}

async function getCurrentBranch(pi: ExtensionAPI, cwd: string): Promise<string> {
	const branch = await git(pi, cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
	if (branch.code !== 0 || !branch.stdout.trim()) {
		throw new Error("Refusing to commit on detached HEAD.");
	}
	return branch.stdout.trim();
}

async function getHead(pi: ExtensionAPI, cwd: string): Promise<string | undefined> {
	return optionalGit(pi, cwd, ["rev-parse", "--verify", "HEAD"]);
}

async function hasStagedChanges(pi: ExtensionAPI, cwd: string): Promise<boolean> {
	const result = await git(pi, cwd, ["diff", "--cached", "--quiet", "--exit-code"]);
	return result.code === 1;
}

async function hasAnyChanges(pi: ExtensionAPI, cwd: string): Promise<boolean> {
	const status = await gitOk(pi, cwd, ["status", "--porcelain=v1"], 30_000);
	return status.stdout.trim().length > 0;
}

async function ensureNoUnmergedFiles(pi: ExtensionAPI, cwd: string): Promise<void> {
	const unmerged = await gitOk(pi, cwd, ["diff", "--name-only", "--diff-filter=U"]);
	if (unmerged.stdout.trim()) {
		throw new Error(`Refusing to commit with unresolved merge conflicts:\n${unmerged.stdout.trim()}`);
	}
}

async function resolvePushTarget(pi: ExtensionAPI, cwd: string, branch: string): Promise<PushTarget> {
	const remote = await optionalGit(pi, cwd, ["config", `branch.${branch}.remote`]);
	const mergeRef = await optionalGit(pi, cwd, ["config", `branch.${branch}.merge`]);

	if (remote && mergeRef) {
		return {
			remote,
			args: ["push", "--porcelain", remote, `HEAD:${mergeRef}`],
			description: `${remote}/${mergeRef.replace(/^refs\/heads\//, "")}`,
			hasUpstream: true,
		};
	}

	const origin = await git(pi, cwd, ["remote", "get-url", "origin"]);
	if (origin.code !== 0) {
		throw new Error("No upstream is configured and no origin remote exists. Set an upstream first.");
	}

	return {
		remote: "origin",
		args: ["push", "--porcelain", "-u", "origin", "HEAD"],
		description: `origin/${branch}`,
		hasUpstream: false,
	};
}

async function preflightBranchState(pi: ExtensionAPI, cwd: string, target: PushTarget): Promise<void> {
	if (!target.hasUpstream) return;

	if (target.remote !== ".") {
		const fetch = await git(pi, cwd, ["fetch", "--quiet", target.remote], 120_000);
		if (fetch.code !== 0) {
			const output = [fetch.stderr.trim(), fetch.stdout.trim()].filter(Boolean).join("\n");
			throw new Error(`Could not fetch ${target.remote}; refusing to commit before branch state is known.\n${output}`);
		}
	}

	const counts = await gitOk(pi, cwd, ["rev-list", "--left-right", "--count", "HEAD...@{u}"]);
	const [aheadRaw, behindRaw] = counts.stdout.trim().split(/\s+/);
	const ahead = Number(aheadRaw || 0);
	const behind = Number(behindRaw || 0);
	if (behind > 0) {
		const state = ahead > 0 ? "diverged" : "behind";
		throw new Error(`Current branch is ${state} its upstream (${ahead} ahead, ${behind} behind). Pull/rebase first.`);
	}
}

async function buildDiffContext(pi: ExtensionAPI, cwd: string, mode: "staged" | "working"): Promise<string> {
	const cached = mode === "staged";
	const prefix = cached ? ["diff", "--cached"] : ["diff"];
	const status = cached
		? await gitOk(pi, cwd, ["diff", "--cached", "--name-status"])
		: await gitOk(pi, cwd, ["status", "--porcelain=v1"]);
	const stat = await gitOk(pi, cwd, [...prefix, "--stat", "--no-ext-diff"]);
	const patch = await gitOk(pi, cwd, [...prefix, "--patch", "--minimal", "--no-ext-diff"], 120_000);

	let untracked = "";
	if (!cached) {
		const files = await optionalGit(pi, cwd, ["ls-files", "--others", "--exclude-standard"]);
		if (files) untracked = `\n\nUntracked files:\n${files}`;
	}

	return truncateMiddle(`Status / name-status:\n${status.stdout.trim() || "(none)"}${untracked}\n\nStat:\n${stat.stdout.trim() || "(none)"}\n\nPatch:\n${patch.stdout.trim() || "(no patch available)"}`);
}

async function generateCommitMessage(
	ctx: ExtensionCommandContext,
	diffContext: string,
	mode: "staged" | "working",
	userContext: string,
): Promise<string> {
	if (!ctx.model) throw new Error("No model selected; cannot generate commit message.");
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
	if (!auth.ok) throw new Error(auth.error);
	if (!auth.apiKey) throw new Error(`No API key available for ${ctx.model.provider}.`);

	const userMessage: UserMessage = {
		role: "user",
		content: [
			{
				type: "text",
				text: `Generate a git commit message for the ${mode === "staged" ? "staged" : "working tree"} changes below.${
					userContext ? `\n\nAdditional user context:\n${userContext}` : ""
				}\n\n${diffContext}`,
			},
		],
		timestamp: Date.now(),
	};

	const response = await complete(
		ctx.model,
		{
			systemPrompt:
				"You write concise, accurate git commit messages. Output only the commit message, with no markdown fences, no explanation, and no alternatives. Use imperative mood. Keep the subject line at or under 72 characters. Add a short body only when it adds useful context.",
			messages: [userMessage],
		},
		{ apiKey: auth.apiKey, headers: auth.headers, maxTokens: 512, signal: ctx.signal },
	);

	const message = sanitizeCommitMessage(textContent(response));
	if (!message.trim()) throw new Error("Model returned an empty commit message.");
	return message;
}

async function commitWithMessage(pi: ExtensionAPI, cwd: string, message: string): Promise<ExecResult> {
	const dir = await mkdtemp(join(tmpdir(), "pi-commit-"));
	const file = join(dir, "message.txt");
	try {
		await writeFile(file, `${message.trim()}\n`, "utf8");
		return await git(pi, cwd, ["commit", "-F", file], 120_000);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function rollbackCommit(pi: ExtensionAPI, cwd: string, createdHead: string, previousHead: string | undefined): Promise<string> {
	const currentHead = await getHead(pi, cwd);
	if (currentHead !== createdHead) {
		return `Did not rollback: HEAD moved from created commit ${createdHead.slice(0, 12)} to ${currentHead?.slice(0, 12) ?? "unknown"}.`;
	}

	if (previousHead) {
		const reset = await git(pi, cwd, ["reset", "--soft", previousHead], 60_000);
		if (reset.code !== 0) {
			const output = [reset.stderr.trim(), reset.stdout.trim()].filter(Boolean).join("\n");
			return `Rollback failed; created commit is still at HEAD.\n${output}`;
		}
		return "Rolled back commit with git reset --soft; changes are staged.";
	}

	const removeHead = await git(pi, cwd, ["update-ref", "-d", "HEAD"], 60_000);
	if (removeHead.code !== 0) {
		const output = [removeHead.stderr.trim(), removeHead.stdout.trim()].filter(Boolean).join("\n");
		return `Rollback failed for initial commit; created commit is still at HEAD.\n${output}`;
	}
	return "Rolled back initial commit by deleting HEAD; changes are staged.";
}

function formatExecFailure(prefix: string, result: ExecResult): string {
	const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
	return `${prefix}${output ? `\n${output}` : ""}`;
}

function classifyPushFailure(result: ExecResult): string {
	const output = `${result.stderr}\n${result.stdout}`.toLowerCase();
	if (output.includes("non-fast-forward") || output.includes("fetch first") || output.includes("stale info")) {
		return "Push failed: remote is ahead or rejected a non-fast-forward update.";
	}
	if (output.includes("protected branch") || output.includes("pre-receive hook declined") || output.includes("hook declined")) {
		return "Push failed: remote policy or hook rejected the commit.";
	}
	if (output.includes("permission denied") || output.includes("authentication failed") || output.includes("could not read username")) {
		return "Push failed: authentication or authorization failed.";
	}
	if (output.includes("could not resolve host") || output.includes("failed to connect") || output.includes("timed out")) {
		return "Push failed: network or remote connectivity problem.";
	}
	return "Push failed.";
}

function report(pi: ExtensionAPI, ctx: ExtensionCommandContext, message: string, level: "info" | "warning" | "error" = "info"): void {
	pi.sendMessage({ customType: "git-commit", content: message, display: true });
	if (ctx.hasUI) ctx.ui.notify(message.split("\n")[0] ?? message, level);
}

async function runCommit(pi: ExtensionAPI, ctx: ExtensionCommandContext, options: CommandOptions): Promise<void> {
	await ctx.waitForIdle();
	const cwd = await ensureRepository(pi, ctx);
	if (!cwd) return;

	try {
		await ensureNoUnmergedFiles(pi, cwd);
		const branch = await getCurrentBranch(pi, cwd);
		const target = await resolvePushTarget(pi, cwd, branch);
		await preflightBranchState(pi, cwd, target);

		const stagedBefore = await hasStagedChanges(pi, cwd);
		if (options.all || !stagedBefore) {
			if (!(await hasAnyChanges(pi, cwd))) {
				report(pi, ctx, "No changes to commit.", "info");
				return;
			}
			await gitOk(pi, cwd, ["add", "-A"], 60_000);
		}

		if (!(await hasStagedChanges(pi, cwd))) {
			report(pi, ctx, "No staged changes to commit.", "info");
			return;
		}

		const diffContext = await buildDiffContext(pi, cwd, "staged");
		const message = await generateCommitMessage(ctx, diffContext, "staged", options.context);
		const previousHead = await getHead(pi, cwd);

		const commit = await commitWithMessage(pi, cwd, message);
		if (commit.code !== 0) {
			report(pi, ctx, formatExecFailure("Commit failed; changes remain staged.", commit), "error");
			return;
		}

		const createdHead = await getHead(pi, cwd);
		if (!createdHead) {
			report(pi, ctx, "Commit appeared to succeed, but HEAD could not be resolved. Not pushing.", "error");
			return;
		}

		const shortHash = (await optionalGit(pi, cwd, ["rev-parse", "--short", createdHead])) ?? createdHead.slice(0, 12);
		const push = await git(pi, cwd, target.args, 180_000);
		if (push.code !== 0) {
			const rollback = await rollbackCommit(pi, cwd, createdHead, previousHead);
			report(
				pi,
				ctx,
				`${formatExecFailure(`${classifyPushFailure(push)} Rolling back the commit so changes remain staged.`, push)}\n\n${rollback}`,
				"error",
			);
			return;
		}

		const stat = await optionalGit(pi, cwd, ["show", "--shortstat", "--format=format:", createdHead]);
		const pushOutput = [push.stdout.trim(), push.stderr.trim()].filter(Boolean).join("\n");
		report(
			pi,
			ctx,
			`[${branch} ${shortHash}] ${message.split("\n", 1)[0]}${stat ? `\n${stat.trim()}` : ""}\nPushed to ${target.description}.${pushOutput ? `\n\n${pushOutput}` : ""}`,
			"info",
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report(pi, ctx, message, "error");
	}
}

async function runGenCommit(pi: ExtensionAPI, ctx: ExtensionCommandContext, args: string): Promise<void> {
	await ctx.waitForIdle();
	const cwd = await ensureRepository(pi, ctx);
	if (!cwd) return;

	try {
		await ensureNoUnmergedFiles(pi, cwd);
		const mode = (await hasStagedChanges(pi, cwd)) ? "staged" : "working";
		if (mode === "working" && !(await hasAnyChanges(pi, cwd))) {
			report(pi, ctx, "No changes found.", "info");
			return;
		}
		const diffContext = await buildDiffContext(pi, cwd, mode);
		const message = await generateCommitMessage(ctx, diffContext, mode, args.trim());
		report(pi, ctx, `Generated commit message:\n\n${message}`, "info");
		if (ctx.hasUI) ctx.ui.setEditorText(message);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report(pi, ctx, message, "error");
	}
}

export default function gitCommitExtension(pi: ExtensionAPI) {
	pi.registerMessageRenderer("git-commit", (message, _options, theme) => {
		return new Text(theme.fg("text", String(message.content ?? "")), 0, 0);
	});

	pi.registerCommand("commit", {
		description: "Generate a commit message, commit staged changes or all changes, then push",
		getArgumentCompletions: (prefix) => {
			const values = ["--all"];
			const filtered = values.filter((value) => value.startsWith(prefix));
			return filtered.length ? filtered.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			await runCommit(pi, ctx, parseCommitArgs(args));
		},
	});

	pi.registerCommand("gencommit", {
		description: "Generate a commit message from staged changes, or working tree changes if none are staged",
		handler: async (args, ctx) => {
			await runGenCommit(pi, ctx, args);
		},
	});
}
