import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type TestContext, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
	type ExtensionToolContext,
	initTheme,
	type Theme,
	type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import {
	type Component,
	KeybindingsManager,
	type Terminal,
	type TUI,
	TUI_KEYBINDINGS,
	visibleWidth,
} from "@earendil-works/pi-tui";
import commit from "../extensions/git-commit.ts";

type Hook = (event: unknown, ctx: ExtensionContext) => unknown;
type Prompt = Component & { dispose?(): void };
const UP = "\x1b[A";
const DOWN = "\x1b[B";
const ENTER = "\r";
const ESC = "\x1b";

function harness(t: TestContext, initial = true) {
	initTheme("dark", false);
	const root = mkdtempSync(join(tmpdir(), "ai-workflow-commit-test-"));
	const envKeys = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE"];
	const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
	process.env.GIT_CONFIG_GLOBAL = "/dev/null";
	process.env.GIT_CONFIG_SYSTEM = "/dev/null";
	for (const key of envKeys.slice(2)) delete process.env[key];
	const git = (args: string[], cwd = root) =>
		execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
	git(["init", "-b", "main"]);
	git(["config", "user.name", "Test"]);
	git(["config", "user.email", "test@example.invalid"]);
	git(["config", "commit.gpgsign", "false"]);
	if (initial) {
		writeFileSync(join(root, "code.txt"), "first\nsecond\nthird\n");
		git(["add", "code.txt"]);
		git(["commit", "-m", "chore: seed"]);
	}
	const commands = new Map<string, { handler: (args: string, ctx: ExtensionCommandContext) => Promise<void> }>();
	const hooks = new Map<string, Hook>();
	let tool: ToolDefinition | undefined;
	const messages: string[] = [];
	const prompts: { title: string; text: string; choices?: string[] }[] = [];
	const attention: unknown[] = [];
	const notices: string[] = [];
	const modelInputs: unknown[] = [];
	const selections: string[] = [];
	const inputs: string[] = [];
	const drafts = ["fix: update code"];
	let onPrompt: (prompt: { title: string; component: Prompt }) => void = () => {};
	let selectFile = 0;
	let pendingPrompt: Prompt | undefined;
	const keys = new KeybindingsManager(TUI_KEYBINDINGS);
	const theme = { fg: (_key: string, text: string) => text, bold: (text: string) => text } as Theme;
	const terminal = { rows: 40 };
	const ctx = {
		cwd: root,
		mode: "tui",
		hasUI: true,
		thinkingLevel: "low",
		model: { id: "test-model", provider: "test" },
		waitForIdle: async () => {},
		modelRegistry: {
			streamSimple: (_model: unknown, context: unknown, options: unknown) => {
				modelInputs.push({ context, options });
				return {
					result: async () => ({
						stopReason: "stop",
						content: [{ type: "text", text: drafts.shift() ?? "fix: update code" }],
						usage: {
							input: 10,
							output: 5,
							cacheRead: 0,
							cacheWrite: 0,
							totalTokens: 15,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
					}),
				};
			},
		},
		ui: {
			setWorkingMessage() {},
			notify: (message: string) => notices.push(message),
			select: async (title: string, choices: string[]) => {
				prompts.push({ title, text: title, choices });
				const selection = selections.shift();
				assert.ok(selection && choices.includes(selection), `Unexpected selection: ${selection} for ${title}`);
				return selection;
			},
			input: async (title: string) => {
				prompts.push({ title, text: title });
				return inputs.shift();
			},
			editor: async (title: string) => {
				prompts.push({ title, text: title });
				return inputs.shift();
			},
			custom: (factory: Parameters<ExtensionContext["ui"]["custom"]>[0]) =>
				new Promise((resolve) => {
					const component = factory(
						{ terminal, requestRender() {} } as unknown as TUI,
						theme,
						keys as Parameters<typeof factory>[2],
						(value) => {
							pendingPrompt?.dispose?.();
							resolve(value);
						},
					);
					assert.ok(!(component instanceof Promise));
					pendingPrompt = component;
					let rendered = component.render(100).join("\n");
					const title = rendered.includes("Edit commit message") ? "Edit commit message" : rendered.split("\n")[0];
					const lines: string[] = [rendered];
					for (let i = 0; i < 10_000; i++) {
						component.handleInput?.("\x1b[6;2~");
						const next = component.render(100).join("\n");
						if (next === rendered) break;
						lines.push(next);
						rendered = next;
					}
					prompts.push({ title, text: lines.join("\n") });
					onPrompt({ title, component });
					if (title.startsWith("Pick files")) {
						for (let i = 0; i < selectFile; i++) component.handleInput?.(DOWN);
						component.handleInput?.(" ");
						component.handleInput?.(ENTER);
					} else if (title === "Edit commit message") {
						component.handleInput?.("\x01");
						component.handleInput?.("\x0b");
						component.handleInput?.(`\x1b[200~${inputs.shift()}\x1b[201~`);
						component.handleInput?.(ENTER);
					} else if (title === "Commit diff") component.handleInput?.(ESC);
					else {
						const selection = selections.shift();
						assert.ok(selection, `No response for ${title}`);
						if (selection === "Escape") component.handleInput?.(ESC);
						else {
							const choices =
								title === "Commit preview"
									? ["Review diff", "Edit message", "Regenerate", "Continue"]
									: rendered.includes("Commit despite warnings")
										? ["Commit despite warnings", "Commit and push despite warnings", "Cancel"]
										: ["Commit", "Commit and push", "Cancel"];
							const target = choices.indexOf(selection);
							assert.notEqual(target, -1, `Invalid response ${selection}`);
							for (let i = 0; i < choices.length - 1 - target; i++) component.handleInput?.(UP);
							component.handleInput?.(ENTER);
						}
					}
				}),
		},
	} as unknown as ExtensionCommandContext;
	commit({
		on: (name: string, hook: Hook) => hooks.set(name, hook),
		events: { emit: (_channel: string, data: unknown) => attention.push(data) },
		registerTool: (definition: ToolDefinition) => {
			tool = definition;
		},
		registerCommand: (name: string, value: typeof commands extends Map<string, infer T> ? T : never) =>
			commands.set(name, value),
		sendUserMessage: (text: string) => messages.push(text),
		getThinkingLevel: () => "low",
	} as unknown as ExtensionAPI);
	assert.ok(tool);
	t.after(() => {
		rmSync(root, { recursive: true, force: true });
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
	const execute = async (guidance = "", signal?: AbortSignal) => {
		assert.ok(tool);
		hooks.get("tool_execution_start")?.({ toolName: "git_commit", toolCallId: "test", args: {} }, ctx);
		try {
			return await tool.execute("test", { guidance }, signal, undefined, ctx as unknown as ExtensionToolContext);
		} finally {
			hooks.get("tool_execution_end")?.({ toolName: "git_commit", toolCallId: "test" }, ctx);
		}
	};
	return {
		root,
		git,
		ctx,
		tool,
		execute,
		hooks,
		messages,
		selections,
		inputs,
		drafts,
		prompts,
		attention,
		modelInputs,
		notices,
		terminal,
		set onPrompt(value: typeof onPrompt) {
			onPrompt = value;
		},
		set selectFile(value: number) {
			selectFile = value;
		},
		command: async (args = "") => {
			const command = commands.get("commit");
			assert.ok(command);
			await command.handler(args, ctx);
		},
		write: (path: string, contents: string) => writeFileSync(join(root, path), contents),
		stage: () => git(["add", "-A"]),
		head: () => git(["rev-parse", "HEAD"]),
		hook: (name: string, script: string) => {
			const path = join(root, ".git", "hooks", name);
			writeFileSync(path, `#!/bin/sh\n${script}\n`);
			chmodSync(path, 0o755);
		},
		text: (result: Awaited<ReturnType<ToolDefinition["execute"]>>) =>
			result.content
				.filter((part) => part.type === "text")
				.map((part) => part.text)
				.join("\n"),
	};
}

test("staged hunks commit without including unstaged edits; every commit gets final confirmation", async (t) => {
	const app = harness(t);
	app.write("code.txt", "staged\nsecond\nthird\n");
	app.stage();
	app.write("code.txt", "staged\nsecond\nunstaged\n");
	app.write("outside.txt", "keep outside\n");
	app.selections.push("Continue", "Commit");
	const result = await app.execute("focus on the first line");
	assert.equal(result.isError, false);
	assert.equal(app.git(["show", "HEAD:code.txt"]), "staged\nsecond\nthird");
	assert.match(app.git(["diff"]), /unstaged/);
	assert.ok(existsSync(join(app.root, "outside.txt")));
	assert.equal(app.prompts.at(-1)?.title, "Final confirmation");
	assert.match(app.prompts.at(-1)?.text ?? "", /Exact message:.*\nfix: update code/);
	assert.match(app.text(result), /Not pushed/);
	assert.match(JSON.stringify(app.modelInputs), /focus on the first line/);
	assert.equal(result.usage?.totalTokens, 15);
});

test("cancel before confirmation preserves index bytes and all working contents", async (t) => {
	const app = harness(t);
	app.write("code.txt", "changed\n");
	app.write("new.txt", "new\n");
	const index = readFileSync(join(app.root, ".git", "index"));
	const head = app.head();
	app.selections.push("Everything", "Continue", "Cancel");
	const result = await app.execute();
	assert.match(app.text(result), /cancelled/);
	assert.equal(app.head(), head);
	assert.deepEqual(readFileSync(join(app.root, ".git", "index")), index);
	assert.equal(readFileSync(join(app.root, "code.txt"), "utf8"), "changed\n");
	assert.equal(readFileSync(join(app.root, "new.txt"), "utf8"), "new\n");
});

test("whole-file picker handles literal pathspec-looking names and excludes other changes", async (t) => {
	const app = harness(t);
	app.write(":(glob)*", "literal\n");
	app.write("code.txt", "outside scope\n");
	app.selectFile = 1; // Status lists tracked code.txt before this untracked file.
	app.selections.push("Pick files", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["show", "HEAD::(glob)*"]), "literal");
	assert.equal(app.git(["show", "HEAD:code.txt"]), "first\nsecond\nthird");
	assert.match(app.git(["status", "--porcelain"]), /code.txt/);
});

test("initial commits support untracked files; Everything includes deletions and ignores ignored files", async (t) => {
	const app = harness(t, false);
	app.write("new.txt", "initial\n");
	app.selections.push("Everything", "Continue", "Commit");
	assert.equal((await app.execute()).isError, false);
	app.write(".gitignore", "ignored.txt\n");
	app.write("ignored.txt", "keep local\n");
	rmSync(join(app.root, "new.txt"));
	app.selections.push("Everything", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["ls-tree", "--name-only", "HEAD"]), ".gitignore");
	assert.equal(readFileSync(join(app.root, "ignored.txt"), "utf8"), "keep local\n");
});

test("edit, inspect, and regenerate preserve the scope and show the exact final message", async (t) => {
	const app = harness(t);
	app.write("code.txt", "selected\n");
	app.stage();
	app.write("not-selected.txt", "outside\n");
	app.drafts.push("fix: regenerated");
	app.inputs.push("fix: user wording\n\nExplain the reason.");
	app.selections.push("Review diff", "Edit message", "Regenerate", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["log", "-1", "--format=%B"]), "fix: regenerated");
	assert.equal(app.git(["ls-tree", "--name-only", "HEAD"]), "code.txt");
	assert.equal(app.modelInputs.length, 2);
	assert.equal(result.usage?.totalTokens, 30);
	assert.ok(app.prompts.some((prompt) => prompt.title === "Commit diff" && /selected/.test(prompt.text)));
	assert.deepEqual(app.attention.at(-1), { id: "commit:test", waiting: false });
});

test("content changes with the same git status invalidate approval before real staging", async (t) => {
	const app = harness(t);
	app.write("code.txt", "version one\n");
	const head = app.head();
	const index = app.git(["ls-files", "--stage"]);
	const status = app.git(["status", "--porcelain"]);
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation") app.write("code.txt", "version two\n");
	};
	app.selections.push("Everything", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(app.git(["status", "--porcelain"]), status);
	assert.equal(result.isError, true);
	assert.match(app.text(result), /changed during review/);
	assert.equal(app.head(), head);
	assert.equal(app.git(["ls-files", "--stage"]), index);
});

test("staging and branch changes invalidate approval instead of resetting or switching", async (t) => {
	const app = harness(t);
	app.write("code.txt", "selected\n");
	app.stage();
	const head = app.head();
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation") {
			app.write("outside.txt", "new staging\n");
			app.stage();
		}
	};
	app.selections.push("Continue", "Commit");
	assert.equal((await app.execute()).isError, true);
	assert.equal(app.head(), head);
	assert.match(app.git(["diff", "--cached", "--name-only"]), /outside.txt/);
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation") app.git(["switch", "-c", "other"]);
	};
	app.selections.push("Continue", "Commit");
	assert.equal((await app.execute()).isError, true);
	assert.equal(app.git(["branch", "--show-current"]), "other");
	assert.equal(app.head(), head);
});

test("failed hooks preserve staging and leave history unchanged without retry", async (t) => {
	const app = harness(t);
	app.write("code.txt", "changed\n");
	app.hook("pre-commit", "echo hook-rejected >&2\nexit 1");
	const head = app.head();
	app.selections.push("Everything", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.match(app.text(result), /hook-rejected/);
	assert.equal(app.head(), head);
	assert.equal(app.git(["diff", "--cached", "--name-only"]), "code.txt");
	assert.match(app.text(result), /Staging may have changed/);
});

function remote(app: ReturnType<typeof harness>, name = "publish") {
	const path = join(app.root, "remote.git");
	mkdirSync(path);
	app.git(["init", "--bare"], path);
	app.git(["remote", "add", name, path]);
	app.git(["push", name, "main:main"]);
	return path;
}

test("commit and push requires destination approval and previews older unpushed commits", async (t) => {
	const app = harness(t);
	const path = remote(app);
	app.write("code.txt", "older\n");
	app.stage();
	app.git(["commit", "-m", "fix: earlier work"]);
	app.write("code.txt", "new\n");
	app.stage();
	app.selections.push("Continue", "Commit and push", "publish", "Commit and push");
	app.inputs.push("main");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["rev-parse", "refs/heads/main"], path), app.head());
	const final = app.prompts.filter((prompt) => prompt.title === "Final confirmation");
	assert.equal(final.length, 2);
	assert.match(final[1].text, /Existing commits to publish: 1/);
	assert.match(final[1].text, /earlier work/);
	assert.match(final[1].text, /publish → main/);
});

test("push failure keeps the new local commit and does not retry or roll it back", async (t) => {
	const app = harness(t);
	const path = remote(app);
	const reject = join(path, "hooks", "pre-receive");
	writeFileSync(reject, "#!/bin/sh\necho rejected-by-remote >&2\nexit 1\n");
	chmodSync(reject, 0o755);
	const remoteHead = app.git(["rev-parse", "refs/heads/main"], path);
	app.write("code.txt", "new\n");
	app.stage();
	app.selections.push("Continue", "Commit and push", "publish", "Commit and push");
	app.inputs.push("main");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.match(app.text(result), /rejected-by-remote/);
	assert.match(app.text(result), /Local commit .* remains/);
	assert.notEqual(app.head(), remoteHead);
	assert.equal(app.git(["rev-parse", "refs/heads/main"], path), remoteHead);
});

test("a hook changing the commit content blocks pushing and keeps the changed commit", async (t) => {
	const app = harness(t);
	const path = remote(app);
	const remoteHead = app.head();
	app.write("code.txt", "approved\n");
	app.stage();
	app.hook("pre-commit", "printf 'hook changed content\\n' > code.txt\ngit add code.txt");
	app.selections.push("Continue", "Commit and push", "publish", "Commit and push");
	app.inputs.push("main");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.match(app.text(result), /differs from the preview/);
	assert.equal(app.git(["show", "HEAD:code.txt"]), "hook changed content");
	assert.equal(app.git(["rev-parse", "refs/heads/main"], path), remoteHead);
});

test("repository branch instructions, detached HEAD, and active Git operations fail before preview", async (t) => {
	const app = harness(t);
	app.write("code.txt", "changed\n");
	app.stage();
	app.write("AGENTS.md", "When I ask for a commit, it goes on release.\n");
	let result = await app.execute();
	assert.match(app.text(result), /requires commits on release/);
	rmSync(join(app.root, "AGENTS.md"));
	app.git(["checkout", "--detach"]);
	result = await app.execute();
	assert.match(app.text(result), /Detached HEAD/);
	app.git(["switch", "main"]);
	writeFileSync(join(app.root, ".git", "MERGE_HEAD"), app.head());
	result = await app.execute();
	assert.match(app.text(result), /active Git operation/);
	assert.equal(app.prompts.length, 0);
});

test("sensitive filenames show warnings without disclosing their contents; cancellation preserves staging", async (t) => {
	const app = harness(t);
	const head = app.head();
	for (const path of [".env", "auth.json", "backup.p12"]) {
		const opaque = "opaque-sensitive-fixture";
		app.write(path, `${opaque}\n`);
		app.stage();
		const index = readFileSync(join(app.root, ".git", "index"));
		app.selections.push("Review diff", "Continue", "Cancel");
		const result = await app.execute();
		assert.equal(result.isError, false, app.text(result));
		assert.match(app.text(result), /cancelled/);
		assert.equal(app.head(), head);
		assert.deepEqual(readFileSync(join(app.root, ".git", "index")), index);
		const preview = app.prompts.filter((prompt) => prompt.title === "Commit preview").at(-1)?.text ?? "";
		assert.ok(preview.includes(path));
		assert.match(preview, /Sensitive filename/);
		assert.match(app.prompts.at(-1)?.text ?? "", /Commit despite warnings/);
		assert.match(app.prompts.at(-1)?.text ?? "", /^> Cancel$/m);
		for (const output of [JSON.stringify(app.modelInputs), JSON.stringify(app.prompts), JSON.stringify(result)]) {
			assert.equal(output.includes(opaque), false);
		}
		app.git(["reset"]);
		rmSync(join(app.root, path));
	}
});

test("credential warnings identify candidate lines and require explicit confirmation without exposing the file", async (t) => {
	const app = harness(t);
	mkdirSync(join(app.root, "tests"));
	const token = `sk-proj-${"x".repeat(32)}`;
	const staged = `FILE-CONTENT-MARKER\napi = "${token}"\n`;
	app.write("tests/fixture.txt", staged);
	app.stage();
	app.write("tests/fixture.txt", `${staged}unstaged tail\n`);
	app.selections.push("Review diff", "Continue", "Commit despite warnings");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["show", "HEAD:tests/fixture.txt"]), staged.trim());
	assert.match(app.git(["diff"]), /unstaged tail/);
	const preview = app.prompts.find((prompt) => prompt.title === "Commit preview")?.text ?? "";
	assert.match(preview, /"tests\/fixture\.txt":2 · API token/);
	assert.match(preview, /api = "\[redacted\]"/);
	assert.match(JSON.stringify(app.modelInputs), /diff withheld/);
	assert.equal(JSON.stringify(app.modelInputs).includes("FILE-CONTENT-MARKER"), false);
	for (const output of [JSON.stringify(app.modelInputs), JSON.stringify(app.prompts), JSON.stringify(result)]) {
		assert.equal(output.includes(token), false);
	}
});

test("private-key header fixtures warn with a location while key bodies stay out of drafts and diff views", async (t) => {
	const app = harness(t);
	const body = "OPAQUE-PRIVATE-KEY-FIXTURE";
	app.write("code.txt", `intro\n-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`);
	app.stage();
	app.selections.push("Review diff", "Continue", "Cancel");
	const result = await app.execute();
	assert.match(app.text(result), /cancelled/);
	assert.match(app.prompts[0].text, /"code\.txt":2 · Private-key header/);
	for (const output of [JSON.stringify(app.modelInputs), JSON.stringify(app.prompts), JSON.stringify(result)]) {
		assert.equal(output.includes(body), false);
		assert.equal(output.includes("-----BEGIN PRIVATE KEY-----"), false);
	}
});

test("sensitive-file approval commits unchanged contents and still needs a separate push destination confirmation", async (t) => {
	const app = harness(t);
	const path = remote(app);
	app.write(".env", "OPAQUE-ENV-FIXTURE\n");
	app.stage();
	app.selections.push("Continue", "Commit and push despite warnings", "publish", "Commit and push despite warnings");
	app.inputs.push("main");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["show", "HEAD:.env"]), "OPAQUE-ENV-FIXTURE");
	assert.equal(app.git(["rev-parse", "refs/heads/main"], path), app.head());
	const finals = app.prompts.filter((prompt) => prompt.title === "Final confirmation");
	assert.equal(finals.length, 2);
	assert.match(finals[1].text, /Sensitive filename/);
	assert.match(finals[1].text, /publish → main/);
	for (const output of [JSON.stringify(app.modelInputs), JSON.stringify(app.prompts), JSON.stringify(result)]) {
		assert.equal(output.includes("OPAQUE-ENV-FIXTURE"), false);
	}
	app.write(".env", "new opaque fixture\n");
	app.stage();
	const head = app.head();
	app.selections.push("Continue", "Cancel");
	await app.execute();
	assert.equal(app.head(), head);
	assert.match(app.prompts.at(-1)?.text ?? "", /Commit despite warnings/);
});

test("changing a suspected secret invalidates its approval even when redacted findings look identical", async (t) => {
	const app = harness(t);
	app.write("code.txt", `api = sk-${"x".repeat(32)}\n`);
	const head = app.head();
	const index = readFileSync(join(app.root, ".git", "index"));
	const status = app.git(["status", "--porcelain"]);
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation") app.write("code.txt", `api = sk-${"y".repeat(32)}\n`);
	};
	app.selections.push("Everything", "Continue", "Commit despite warnings");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.deepEqual(readFileSync(join(app.root, ".git", "index")), index);
	assert.equal(app.head(), head);
	assert.equal(app.git(["status", "--porcelain"]), status);
	assert.match(app.text(result), /changed/);
});

test("removing secrets or deleting sensitive files needs no override and does not leak old contents", async (t) => {
	const app = harness(t);
	const token = `github_pat_${"x".repeat(32)}`;
	app.write("code.txt", `api = ${token}\n`);
	app.write(".env", "OLD-OPAQUE-ENV-FIXTURE\n");
	app.stage();
	app.git(["commit", "-m", "chore: seed private fixtures"]);
	app.write("code.txt", "clean contents\n");
	rmSync(join(app.root, ".env"));
	app.stage();
	app.selections.push("Review diff", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["show", "HEAD:code.txt"]), "clean contents");
	assert.equal(app.git(["ls-tree", "--name-only", "HEAD"]), "code.txt");
	assert.doesNotMatch(app.prompts.at(-1)?.text ?? "", /despite warnings/);
	for (const output of [JSON.stringify(app.modelInputs), JSON.stringify(app.prompts), JSON.stringify(result)]) {
		assert.equal(output.includes(token), false);
		assert.equal(output.includes("OLD-OPAQUE-ENV-FIXTURE"), false);
	}
});

test("unstaged secrets outside the candidate commit neither trigger an override nor enter the draft", async (t) => {
	const app = harness(t);
	app.write("code.txt", "safe staged contents\n");
	app.stage();
	const token = `sk-ant-${"x".repeat(32)}`;
	app.write("code.txt", `api = ${token}\n`);
	app.selections.push("Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["show", "HEAD:code.txt"]), "safe staged contents");
	assert.doesNotMatch(app.prompts.at(-1)?.text ?? "", /despite warnings/);
	assert.equal(JSON.stringify(app.modelInputs).includes(token), false);
});

test("aborting a secret warning cancels without staging or committing and releases editing ownership", async (t) => {
	const app = harness(t);
	app.write(".env", "OPAQUE-ABORT-FIXTURE\n");
	const head = app.head();
	const index = readFileSync(join(app.root, ".git", "index"));
	const controller = new AbortController();
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation") controller.abort();
	};
	app.selections.push("Everything", "Continue", "Cancel");
	const result = await app.execute("", controller.signal);
	assert.match(app.text(result), /cancelled/);
	assert.equal(app.head(), head);
	assert.deepEqual(readFileSync(join(app.root, ".git", "index")), index);
	assert.equal(app.hooks.get("tool_call")?.({ toolName: "write", input: {} }, app.ctx), undefined);
	assert.deepEqual(app.attention.at(-1), { id: "commit:test", waiting: false });
});

test("Git hook output for approved sensitive files cannot expose their opaque contents", async (t) => {
	const app = harness(t);
	app.write(".env", "OPAQUE-HOOK-FIXTURE\n");
	app.stage();
	app.hook("pre-commit", "cat .env >&2\nexit 1");
	const head = app.head();
	app.selections.push("Continue", "Commit despite warnings");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.equal(app.head(), head);
	assert.match(app.text(result), /output withheld/);
	assert.equal(JSON.stringify(result).includes("OPAQUE-HOOK-FIXTURE"), false);
});

test("warnings classify GitHub and AWS credentials and redact guidance before drafting", async (t) => {
	const app = harness(t);
	const github = `ghp_${"x".repeat(32)}`;
	const aws = `AKIA${"X".repeat(16)}`;
	const guidance = `sk-${"z".repeat(32)}`;
	app.write("code.txt", `${github}\n${aws}\n`);
	app.stage();
	app.selections.push("Continue", "Cancel");
	await app.execute(`Do not repeat ${guidance}`);
	const preview = app.prompts[0].text;
	assert.match(preview, /"code\.txt":1 · GitHub token/);
	assert.match(preview, /"code\.txt":2 · AWS access-key ID/);
	for (const value of [github, aws, guidance]) {
		assert.equal(JSON.stringify(app.modelInputs).includes(value), false);
		assert.equal(JSON.stringify(app.prompts).includes(value), false);
	}
});

test("files exceeding the bounded scan receive an explicit warning instead of being silently declared safe", async (t) => {
	const app = harness(t);
	app.write("large.bin", "\0".repeat(8 * 1024 * 1024 + 1));
	app.stage();
	const head = app.head();
	app.selections.push("Continue", "Cancel");
	const result = await app.execute();
	assert.match(app.text(result), /cancelled/);
	assert.match(app.prompts[0].text, /large\.bin.*Too large to scan/);
	assert.match(app.prompts.at(-1)?.text ?? "", /Commit despite warnings/);
	assert.equal(app.head(), head);
});

test("command routes through the guarded tool; a busy preview blocks mutation and duplicate commits", async (t) => {
	const app = harness(t);
	await app.command("focus on behaviour");
	assert.match(app.messages[0], /git_commit/);
	assert.match(app.messages[0], /focus on behaviour/);
	assert.equal(app.git(["log", "--format=%s"]).split("\n").length, 1);
	app.write("code.txt", "changed\n");
	app.stage();
	app.onPrompt = ({ title, component }) => {
		if (title !== "Commit preview") return;
		const guard = app.hooks.get("tool_call");
		assert.ok(guard);
		assert.deepEqual(guard({ toolName: "write", input: {} }, app.ctx), {
			block: true,
			reason: "Commit preview owns editing. Finish or cancel it first.",
		});
		assert.equal(guard({ toolName: "read", input: {} }, app.ctx), undefined);
		for (const width of [80, 20, 1]) {
			app.terminal.rows = 16;
			const lines = component.render(width);
			assert.ok(lines.length <= app.terminal.rows);
			assert.ok(lines.every((line) => visibleWidth(line) <= width));
		}
	};
	app.selections.push("Escape");
	const result = await app.execute();
	assert.match(app.text(result), /cancelled/);
	assert.equal(app.hooks.get("tool_call")?.({ toolName: "write", input: {} }, app.ctx), undefined);
});

test("edited multiline messages enter the commit without silent normalization", async (t) => {
	const app = harness(t);
	app.write("code.txt", "changed\n");
	app.stage();
	app.inputs.push("fix: explain the change\n\nKeep the reason in the body.");
	app.selections.push("Edit message", "Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["log", "-1", "--format=%B"]), "fix: explain the change\n\nKeep the reason in the body.");
});

test("bad model output fails without staging or retrying", async (t) => {
	const app = harness(t);
	app.write("code.txt", "changed\n");
	app.drafts[0] = "```\nfix: invalid fenced message\n```";
	app.selections.push("Everything");
	const head = app.head();
	const index = app.git(["ls-files", "--stage"]);
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.equal(app.modelInputs.length, 1);
	assert.equal(app.head(), head);
	assert.equal(app.git(["ls-files", "--stage"]), index);
});

test("worktrees and split indexes preserve staged hunks", async (t) => {
	const app = harness(t);
	const checkout = join(app.root, "checkout");
	app.git(["worktree", "add", "-b", "work", checkout]);
	app.ctx.cwd = checkout;
	writeFileSync(join(checkout, "code.txt"), "staged in worktree\n");
	app.git(["add", "code.txt"], checkout);
	app.git(["update-index", "--split-index"], checkout);
	writeFileSync(join(checkout, "code.txt"), "unstaged in worktree\n");
	app.selections.push("Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, false, app.text(result));
	assert.equal(app.git(["show", "HEAD:code.txt"], checkout), "staged in worktree");
	assert.equal(readFileSync(join(checkout, "code.txt"), "utf8"), "unstaged in worktree\n");
	assert.equal(app.git(["show", "main:code.txt"]), "first\nsecond\nthird");
});

test("HEAD changes invalidate approval even when staged file status remains unchanged", async (t) => {
	const app = harness(t);
	app.write("code.txt", "selected\n");
	app.stage();
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation") app.git(["commit", "--allow-empty", "--only", "-m", "chore: external commit"]);
	};
	app.selections.push("Continue", "Commit");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.match(app.text(result), /changed during review/);
	assert.equal(app.git(["log", "-1", "--format=%s"]), "chore: external commit");
	assert.equal(app.git(["diff", "--cached", "--name-only"]), "code.txt");
});

test("changed remote configuration cancels pushing before any commit", async (t) => {
	const app = harness(t);
	remote(app);
	const head = app.head();
	app.write("code.txt", "selected\n");
	app.stage();
	let finals = 0;
	app.onPrompt = ({ title }) => {
		if (title === "Final confirmation" && ++finals === 2)
			app.git(["remote", "set-url", "--push", "publish", join(app.root, "missing.git")]);
	};
	app.selections.push("Continue", "Commit and push", "publish", "Commit and push");
	app.inputs.push("main");
	const result = await app.execute();
	assert.equal(result.isError, true);
	assert.equal(app.head(), head);
});

test("model context signals omitted patch content while the diff remains inspectable", async (t) => {
	const app = harness(t);
	app.write("code.txt", `${"large change\n".repeat(8000)}END-OF-PATCH\n`);
	app.stage();
	app.selections.push("Review diff", "Continue", "Cancel");
	const result = await app.execute();
	assert.match(app.text(result), /cancelled/);
	assert.match(JSON.stringify(app.modelInputs), /Patch truncated/);
	assert.ok(app.prompts.some((prompt) => prompt.title === "Commit diff" && prompt.text.includes("END-OF-PATCH")));
});

class MemoryTerminal implements Terminal {
	columns = 80;
	rows = 24;
	kittyProtocolActive = false;
	output = "";
	input?: (data: string) => void;
	start(input: (data: string) => void) {
		this.input = input;
	}
	stop() {
		this.input = undefined;
	}
	async drainInput() {}
	write(text: string) {
		this.output += text;
	}
	moveBy() {}
	hideCursor() {}
	showCursor() {}
	clearLine() {}
	clearFromCursor() {}
	clearScreen() {}
	setTitle() {}
	setProgress() {}
	send(text: string) {
		assert.ok(this.input);
		this.input(text);
	}
}
const rendered = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

test(
	"native Pi defaults to cancellation for secret warnings and restores drafts after cancel or editor abort",
	{ timeout: 20_000 },
	async (t) => {
		const app = harness(t);
		app.write("code.txt", "selected\n");
		app.stage();
		const head = app.head();
		const agentDir = join(app.root, ".pi", "agent");
		mkdirSync(agentDir, { recursive: true });
		const previous = { HOME: process.env.HOME, PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR };
		process.env.HOME = app.root;
		process.env.PI_CODING_AGENT_DIR = agentDir;
		t.mock.method(globalThis, "fetch", async () => {
			throw new Error("Network disabled in terminal test");
		});
		let cleanup: (() => Promise<void>) | undefined;
		t.after(async () => {
			try {
				await cleanup?.();
			} finally {
				for (const [key, value] of Object.entries(previous)) {
					if (value === undefined) delete process.env[key];
					else process.env[key] = value;
				}
			}
		});
		const pi = await import("@earendil-works/pi-coding-agent");
		let ctx: ExtensionCommandContext | undefined;
		const modelRuntime = await pi.ModelRuntime.create({
			authPath: join(agentDir, "auth.json"),
			modelsPath: null,
			allowModelNetwork: false,
		});
		const model = modelRuntime.getModels()[0];
		assert.ok(model);
		t.mock.method(
			modelRuntime,
			"streamSimple",
			() =>
				({
					result: async () => ({
						stopReason: "stop",
						content: [{ type: "text", text: "fix: update code" }],
						usage: {
							input: 10,
							output: 5,
							cacheRead: 0,
							cacheWrite: 0,
							totalTokens: 15,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
					}),
				}) as unknown as ReturnType<typeof modelRuntime.streamSimple>,
		);
		const runtime = await pi.createAgentSessionRuntime(
			async ({ cwd, sessionManager }) => {
				const services = await pi.createAgentSessionServices({
					cwd,
					agentDir,
					modelRuntime,
					settingsManager: pi.SettingsManager.inMemory({ theme: "dark", quietStartup: true }),
					resourceLoaderOptions: {
						noExtensions: true,
						noSkills: true,
						noPromptTemplates: true,
						noThemes: true,
						noContextFiles: true,
						additionalExtensionPaths: [fileURLToPath(new URL("../extensions/git-commit.ts", import.meta.url))],
						extensionFactories: [
							(api) => {
								api.registerCommand("capture-commit-context", {
									handler: async (_args, context) => {
										ctx = context;
									},
								});
							},
						],
					},
				});
				assert.deepEqual(services.resourceLoader.getExtensions().errors, []);
				return {
					...(await pi.createAgentSessionFromServices({ services, sessionManager, model, tools: ["git_commit"] })),
					services,
					diagnostics: services.diagnostics,
				};
			},
			{ cwd: app.root, agentDir, sessionManager: pi.SessionManager.inMemory(app.root) },
		);
		const terminal = new MemoryTerminal();
		const mode = new pi.InteractiveMode(runtime, { terminal, initialThemeSetting: "dark" });
		cleanup = async () => {
			try {
				mode.stop();
			} finally {
				await runtime.dispose();
			}
		};
		await mode.init();
		await runtime.session.prompt("/capture-commit-context");
		assert.ok(ctx);
		const ui = ctx.ui;
		const tool = runtime.session.agent.state.tools.find((value) => value.name === "git_commit");
		assert.ok(tool);
		for (const tuiMode of ["regular", "fullscreen"] as const) {
			(mode as unknown as { switchTuiMode(mode: string): void }).switchTuiMode(tuiMode);
			for (const action of ["cancel", "abort-editor", "cancel-warning"] as const) {
				app.write(
					"code.txt",
					action === "cancel-warning" ? "-----BEGIN PRIVATE KEY-----\nNATIVE-PRIVATE-FIXTURE\n" : "selected\n",
				);
				app.stage();
				ui.setEditorText("unfinished chat");
				await rendered();
				terminal.output = "";
				const controller = new AbortController();
				const execution = tool.execute(`native-${action}`, {}, controller.signal);
				try {
					for (let i = 0; i < 100 && !terminal.output.includes("Commit preview"); i++) await rendered();
					assert.match(terminal.output, /Commit preview/);
					if (action === "cancel-warning") {
						assert.match(terminal.output, /Private-key header/);
						assert.doesNotMatch(terminal.output, /NATIVE-PRIVATE-FIXTURE/);
					}
					terminal.output = "";
					if (action === "cancel" || action === "cancel-warning") {
						terminal.send(ENTER);
						await rendered();
						assert.match(terminal.output, /Final confirmation/);
						if (action === "cancel-warning") assert.match(terminal.output, /Commit despite warnings/);
						terminal.send(ENTER);
					} else {
						terminal.send(UP);
						terminal.send(UP);
						terminal.send(ENTER);
						await rendered();
						assert.match(terminal.output, /Edit commit message/);
						controller.abort();
					}
					await execution;
					assert.equal(app.head(), head);
					assert.equal(ui.getEditorText(), "unfinished chat");
					terminal.send("!");
					assert.equal(ui.getEditorText(), "unfinished chat!");
				} finally {
					controller.abort();
					await execution;
				}
			}
		}
	},
);

test("non-interactive and pre-aborted calls do not mutate Git", async (t) => {
	const app = harness(t);
	app.write("code.txt", "changed\n");
	app.stage();
	const head = app.head();
	app.ctx.mode = "rpc";
	await assert.rejects(app.execute(), /interactive terminal/);
	app.ctx.mode = "tui";
	const abort = new AbortController();
	abort.abort();
	const result = await app.execute("", abort.signal);
	assert.equal(result.isError, true);
	assert.equal(app.head(), head);
	assert.equal(app.prompts.length, 0);
});
