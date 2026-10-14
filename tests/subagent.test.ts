import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { getEventListeners } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { promisify } from "node:util";
import {
	createEventBus,
	DefaultResourceLoader,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
	type ExtensionEvent,
	type ExtensionToolContext,
	initTheme,
	type RegisteredCommand,
	SessionManager,
	SettingsManager,
	type Theme,
	type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { type Component, KeybindingsManager, type TUI, TUI_KEYBINDINGS, visibleWidth } from "@earendil-works/pi-tui";
import commit from "../extensions/git.ts";
import notify from "../extensions/notify.ts";
import subagent from "../extensions/subagent.ts";

const UP = "\x1b[A";
const DOWN = "\x1b[B";
const ENTER = "\r";
const ESC = "\x1b";
const NEXT = "\x1b[C";
const PAGE_DOWN = "\x1b[6~";
type View = Component & { dispose?(): void };

const exec = promisify(execFile);
const launcher = resolve("skills/subagent/run.sh");
type Hook = (event: ExtensionEvent, ctx: ExtensionContext) => unknown;
type Job = {
	id: string;
	cli: string;
	task: string;
	status: string;
	output: string;
	error: string;
	delivered: boolean;
	cleanupVerified?: boolean;
	nextOffset?: number;
};
type Details = { jobs: Job[]; capabilities: { stop: boolean; followUp: boolean; resume: boolean } };
type Call = { cli: string; args: string[]; prompt: string; config?: string; nested: string; updater?: string };

// These executables test our process boundary and argument contracts, not the
// real providers' permission enforcement. Authenticated checks need approval.
function fixture(root: string) {
	const bin = join(root, "bin");
	mkdirSync(bin);
	const script = `#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawn } from 'node:child_process';
const cli = basename(process.argv[1]);
const args = process.argv.slice(2);
const fileFlag = cli === 'grok' ? '--prompt-file' : cli === 'opencode' ? '-f' : '';
const fileIndex = fileFlag ? args.indexOf(fileFlag) : -1;
const prompt = readFileSync(fileIndex >= 0 ? args[fileIndex + 1] : 0, 'utf8');
appendFileSync(${JSON.stringify(join(root, "calls"))}, JSON.stringify({cli, args, prompt, config: process.env.OPENCODE_CONFIG_CONTENT, nested: process.env.AI_WORKFLOW_SUBAGENT, updater: process.env.GROK_DISABLE_AUTOUPDATER}) + '\\n');
const which = /CASE:(\\w+)/.exec(prompt)?.[1] || 'normal';
const event = (value) => console.log(JSON.stringify(value));
if (which === 'stream') {
  if (cli === 'pi') {
    event({type: 'message_start', message: {role: 'assistant'}});
    event({type: 'message_update', assistantMessageEvent: {type: 'thinking_delta', delta: 'PRIVATE THINKING'}});
    event({type: 'message_update', assistantMessageEvent: {type: 'text_delta', delta: 'partial report'}});
    event({type: 'tool_execution_start', toolName: 'read', args: {path: 'PRIVATE ARGUMENT'}});
  } else if (cli === 'codex') {
    event({type: 'item.started', item: {type: 'command_execution', command: 'PRIVATE ARGUMENT'}});
  } else if (cli === 'opencode') {
    event({type: 'tool_use', part: {tool: 'read', state: {input: 'PRIVATE ARGUMENT'}}});
  }
  writeFileSync(${JSON.stringify(join(root, "ready"))}, 'ready');
  const timer = setInterval(() => {
    if (!existsSync(${JSON.stringify(join(root, "release"))})) return;
    clearInterval(timer);
    if (cli === 'pi') event({type: 'message_end', message: {role: 'assistant', provider: 'fixture', model: 'model', content: [{type: 'text', text: 'fixture final answer'}], stopReason: 'stop'}});
    else if (cli === 'codex') { event({type: 'item.completed', item: {type: 'agent_message', text: 'fixture final answer'}}); event({type: 'turn.completed'}); }
    else event({type: 'step_finish'});
  }, 10);
} else if (which === 'hold') {
  const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); process.send("ready"); setInterval(() => {}, 1000)'], {detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc']});
  process.on('SIGTERM', () => {});
  child.on('message', () => writeFileSync(${JSON.stringify(join(root, "pids"))}, JSON.stringify([process.pid, child.pid])));
  setInterval(() => {}, 1000);
} else {
  const output = which === 'large' ? 'x'.repeat(2100000) : which === 'pages' ? 'ø'.repeat(26000) : 'fixture answer';
  const model = which === 'substitute' ? 'other/model' : 'fixture/model';
  if (!args.includes('--mode') && !args.includes('--json') && !args.includes('--output-format') && !args.includes('--format')) {
    console.log('plain answer');
  } else if (which === 'invalid') {
    console.log('this is not JSON');
  } else if (which === 'empty') {
    event({unexpected: 'format'});
  } else if (cli === 'pi') {
    event({type: 'message_end', message: {role: 'assistant', provider: model.split('/')[0], model: model.split('/')[1], content: [{type: 'thinking', thinking: 'do not disclose'}, {type: 'text', text: output}], stopReason: which === 'fail' ? 'error' : 'stop', errorMessage: 'provider failed'}});
  } else if (cli === 'claude') {
    event({type: 'result', subtype: which === 'fail' ? 'error_during_execution' : 'success', is_error: which === 'fail', result: output, modelUsage: {'claude-sonnet-fixture': {}}});
  } else if (cli === 'codex') {
    event({type: 'item.completed', item: {type: 'agent_message', text: output}});
    event({type: which === 'fail' ? 'turn.failed' : 'turn.completed', error: {message: 'provider failed'}});
  } else if (cli === 'opencode') {
    event({type: 'text', part: {text: output}});
    event({type: which === 'fail' ? 'error' : 'step_finish', error: 'provider failed'});
  } else {
    event({response: output, ...(which === 'fail' ? {error: 'provider failed'} : {})});
  }
}
`;
	for (const name of ["pi", "claude", "grok", "codex", "opencode"])
		writeFileSync(join(bin, name), script, { mode: 0o700 });
	return bin;
}

function harness(t: TestContext, bindings = {}) {
	const root = mkdtempSync(join(tmpdir(), "ai-workflow-subagent-"));
	const bin = fixture(root);
	const keys = [
		"PATH",
		"HOME",
		"XDG_CONFIG_HOME",
		"XDG_CACHE_HOME",
		"XDG_DATA_HOME",
		"XDG_STATE_HOME",
		"CODEX_HOME",
		"GROK_HOME",
		"PI_CODING_AGENT_DIR",
		"AI_WORKFLOW_SUBAGENT",
		"OPENCODE_CONFIG_CONTENT",
	];
	const before = new Map(keys.map((key) => [key, process.env[key]]));
	process.env.PATH = `${bin}:${process.env.PATH}`;
	for (const key of keys.slice(1, -2)) process.env[key] = root;
	delete process.env.AI_WORKFLOW_SUBAGENT;
	delete process.env.OPENCODE_CONFIG_CONTENT;
	const hooks = new Map<string, Hook[]>();
	const commands = new Map<string, Omit<RegisteredCommand, "name" | "sourceInfo">>();
	const messages: { customType: string; content: unknown; options: unknown }[] = [];
	const statuses = new Map<string, string | undefined>();
	const notices: string[] = [];
	let tool: ToolDefinition | undefined;
	let idle = false;
	let pending = false;
	let approve: () => Promise<boolean> = async () => true;
	let confirmations = 0;
	let saveFails = false;
	initTheme("dark", false);
	const keybindings = new KeybindingsManager(TUI_KEYBINDINGS, bindings);
	const theme = { fg: (_key: string, text: string) => text, bold: (text: string) => text } as Theme;
	const terminal = { rows: 40 };
	let redraws = 0;
	const tui = {
		terminal,
		requestRender() {
			redraws++;
		},
	} as unknown as TUI;
	let widget: View | undefined;
	let view: View | undefined;
	const manager = SessionManager.inMemory(root);
	const ctx = {
		cwd: root,
		mode: "tui",
		hasUI: true,
		model: { provider: "fixture", id: "model", reasoning: true },
		thinkingLevel: "high",
		modelRegistry: {
			find: (provider: string, id: string) => (provider === "fixture" && id === "model" ? ctx.model : undefined),
		},
		sessionManager: manager,
		waitForIdle: async () => {},
		isIdle: () => idle,
		hasPendingMessages: () => pending,
		ui: {
			setStatus: (key: string, value: string | undefined) => statuses.set(key, value),
			confirm: () => {
				confirmations++;
				return approve();
			},
			setWidget: (_key: string, factory: Parameters<ExtensionContext["ui"]["setWidget"]>[1]) => {
				widget?.dispose?.();
				widget = typeof factory === "function" ? factory(tui, theme) : undefined;
			},
			custom: (factory: Parameters<ExtensionContext["ui"]["custom"]>[0]) =>
				new Promise<void>((resolve) => {
					const component = factory(tui, theme, keybindings as Parameters<typeof factory>[2], () => {
						view?.dispose?.();
						view = undefined;
						resolve();
					});
					assert.ok(!(component instanceof Promise));
					view = component;
				}),
			notify: (message: string) => notices.push(message),
		},
	} as unknown as ExtensionToolContext & ExtensionCommandContext;
	const api = {
		events: createEventBus(),
		on: (name: string, handler: Hook) => {
			hooks.set(name, [...(hooks.get(name) ?? []), handler]);
		},
		registerMessageRenderer() {},
		registerTool: (value: ToolDefinition) => {
			tool = value;
		},
		registerCommand: (name: string, value: Omit<RegisteredCommand, "name" | "sourceInfo">) => commands.set(name, value),
		appendEntry: (name: string, data: unknown) => {
			if (saveFails) throw new Error("fixture storage failure");
			return manager.appendCustomEntry(name, structuredClone(data));
		},
		sendMessage: (message: { customType: string; content: unknown }, options: unknown) =>
			messages.push({ ...message, options }),
		getThinkingLevel: () => "high",
	} as unknown as ExtensionAPI;
	subagent(api);
	assert.ok(tool);
	const registered = tool;
	const emit = async (type: string, extra = {}) => {
		let result: unknown;
		for (const handler of hooks.get(type) ?? []) {
			const value = await handler({ type, ...extra } as ExtensionEvent, ctx);
			if (value !== undefined) result = value;
		}
		return result;
	};
	t.after(async () => {
		await emit("session_shutdown");
		if (existsSync(join(root, "pids"))) {
			for (const pid of JSON.parse(readFileSync(join(root, "pids"), "utf8")) as number[]) {
				if (running(pid)) process.kill(pid, "SIGKILL");
			}
		}
		for (const [key, value] of before) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
		rmSync(root, { recursive: true, force: true });
	});
	return {
		root,
		api,
		ctx,
		manager,
		messages,
		statuses,
		notices,
		emit,
		tool: registered,
		get confirmations() {
			return confirmations;
		},
		set saveFails(value: boolean) {
			saveFails = value;
		},
		set approve(value: () => Promise<boolean>) {
			approve = value;
		},
		set idle(value: boolean) {
			idle = value;
		},
		set pending(value: boolean) {
			pending = value;
		},
		terminal,
		get redraws() {
			return redraws;
		},
		get opened() {
			return view !== undefined;
		},
		render: (width = 100) => {
			assert.ok(view);
			return view.render(width);
		},
		widget: (width = 100) => widget?.render(width) ?? [],
		input: (data: string) => {
			assert.ok(view);
			view.handleInput?.(data);
		},
		execute: (params: Record<string, unknown>, signal?: AbortSignal) =>
			registered.execute("call", params, signal, undefined, ctx),
		command: async (args: string) => {
			const command = commands.get("subagents");
			assert.ok(command);
			await command.handler(args, ctx);
		},
		commit: async () => {
			const command = commands.get("commit");
			assert.ok(command);
			await command.handler("", ctx);
		},
		jobs: () => {
			const jobs = new Map<string, Job>();
			for (const entry of manager.getBranch())
				if (entry.type === "custom") {
					const job = entry.data as Job;
					jobs.set(job.id, job);
				}
			return [...jobs.values()];
		},
		calls: (): Call[] =>
			existsSync(join(root, "calls"))
				? readFileSync(join(root, "calls"), "utf8")
						.trim()
						.split("\n")
						.map((line) => JSON.parse(line))
				: [],
	};
}
async function until(check: () => boolean) {
	const end = performance.now() + 5000;
	while (!check()) {
		assert.ok(performance.now() < end, "timed out waiting for fixture process");
		await new Promise((done) => setImmediate(done));
	}
}
function running(pid: number) {
	try {
		process.kill(pid, 0);
		return process.platform !== "linux" || !readFileSync(`/proc/${pid}/stat`, "utf8").includes(") Z");
	} catch {
		return false;
	}
}
const launch = (task = "CASE:normal", extra = {}) => ({ action: "launch", tasks: [{ task }], ...extra });
function details(result: Awaited<ReturnType<ToolDefinition["execute"]>>) {
	return result.details as Details;
}

function notifications(t: TestContext, app: ReturnType<typeof harness>) {
	const program = process.env.TERM_PROGRAM;
	const descriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
	process.env.TERM_PROGRAM = "ghostty";
	Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
	const output: string[] = [];
	const write = process.stdout.write.bind(process.stdout);
	t.mock.method(process.stdout, "write", (text: string | Uint8Array) => {
		if (typeof text !== "string" || !text.startsWith("\x1b")) return write(text);
		output.push(text);
		return true;
	});
	app.ctx.ui.onTerminalInput = () => () => {};
	notify(app.api);
	t.after(() => {
		if (program === undefined) delete process.env.TERM_PROGRAM;
		else process.env.TERM_PROGRAM = program;
		if (descriptor) Object.defineProperty(process.stdout, "isTTY", descriptor);
		else Reflect.deleteProperty(process.stdout, "isTTY");
	});
	return () => output.filter((text) => text.includes("]777;notify;"));
}

const settleNotification = () => new Promise<void>((done) => setTimeout(done, 180));

test("editing approval alerts while waiting and clears attention after refusal or a broken dialog", async (t) => {
	const app = harness(t);
	const alerts = notifications(t, app);
	await app.emit("session_start");
	let answer: (approved: boolean) => void = () => {};
	app.approve = () =>
		new Promise<boolean>((resolve) => {
			answer = resolve;
		});
	const editing = launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] });
	const refused = assert.rejects(app.execute(editing), /not approved/);
	try {
		await settleNotification();
		assert.equal(alerts().length, 1);
		assert.match(alerts()[0], /Answer needed/);
	} finally {
		answer(false);
	}
	await refused;
	app.idle = true;
	await app.emit("agent_settled");
	await settleNotification();
	assert.match(alerts()[1], /Ready for input/);
	app.approve = async () => {
		throw new Error("terminal disposed");
	};
	await assert.rejects(app.execute(editing), /terminal disposed/);
	await settleNotification();
	assert.equal(alerts().length, 2);
	assert.equal(app.calls().length, 0);
});

test("delivered background results suppress completion alerts until the parent's follow-up settles", async (t) => {
	const app = harness(t);
	const alerts = notifications(t, app);
	await app.emit("session_start");
	const send = app.api.sendMessage.bind(app.api);
	app.api.sendMessage = (message, options) => {
		send(message, options);
		app.pending = true;
	};
	await app.execute(launch("CASE:normal", { background: true }));
	await until(() => app.jobs()[0]?.status === "completed");
	app.idle = true;
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 1);
	await settleNotification();
	assert.equal(alerts().length, 0);
	app.pending = false;
	app.idle = false;
	await app.emit("before_agent_start");
	app.idle = true;
	await app.emit("agent_settled");
	await settleNotification();
	assert.equal(alerts().length, 1);
	assert.match(alerts()[0], /Ready for input/);
	assert.equal(app.messages.length, 1);
});

test("Pi's real loader resolves a linked extension and registers its tool and controls", async (t) => {
	const app = harness(t);
	const link = join(app.root, "linked-subagent.ts");
	symlinkSync(resolve("extensions/subagent.ts"), link);
	const loader = new DefaultResourceLoader({
		cwd: app.root,
		agentDir: app.root,
		settingsManager: SettingsManager.inMemory(),
		noExtensions: true,
		noSkills: true,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
		additionalExtensionPaths: [link],
	});
	await loader.reload();
	const loaded = loader.getExtensions();
	assert.deepEqual(loaded.errors, []);
	assert.ok(
		loaded.extensions.some((extension) => extension.tools.has("subagent") && extension.commands.has("subagents")),
	);
	assert.equal(app.calls().length, 0);
});

test("foreground returns the reported answer and preserves the selected Pi model and reasoning", async (t) => {
	const app = harness(t);
	const answer = await app.execute(
		launch("CASE:normal", { tasks: [{ task: "CASE:normal", model: "fixture/model", effort: "medium" }] }),
	);
	assert.equal(details(answer).jobs[0].status, "completed");
	assert.equal(details(answer).jobs[0].output, "fixture answer");
	assert.doesNotMatch(JSON.stringify(answer), /do not disclose/);
	const [call] = app.calls();
	assert.ok(call.args.includes("fixture/model"));
	assert.ok(call.args.includes("medium"));
	assert.ok(call.args.includes("--no-extensions"));
	assert.equal(call.nested, "1");
	assert.match(call.prompt, /Return findings and blockers/);
	assert.deepEqual(details(answer).capabilities, { stop: true, followUp: false, resume: false });
	assert.equal(app.messages.length, 0);
	assert.equal(app.statuses.get("subagents"), undefined);
});

test("parallel jobs retain independent failures even when a CLI exits zero", async (t) => {
	const app = harness(t);
	const answer = await app.execute({
		action: "launch",
		tasks: [
			{ cli: "codex", task: "CASE:normal", model: "chosen-model", effort: "low" },
			{ cli: "claude", task: "CASE:fail", model: "sonnet" },
			{ cli: "opencode", task: "CASE:normal", model: "example/model", effort: "high" },
			{ cli: "grok", task: "CASE:normal", model: "chosen-grok", effort: "high" },
		],
	});
	assert.deepEqual(
		details(answer).jobs.map((job) => job.status),
		["completed", "failed", "completed", "completed"],
	);
	assert.equal(answer.isError, true);
	assert.equal(app.calls().length, 4);
	assert.ok(
		app
			.calls()
			.find((call) => call.cli === "opencode")
			?.args.includes("example/model#high"),
	);
});

test("unknown output, malformed JSON, and reported model substitution are failures without retries", async (t) => {
	const app = harness(t);
	for (const which of ["empty", "invalid", "substitute"]) {
		const answer = await app.execute(launch(`CASE:${which}`));
		assert.equal(details(answer).jobs[0].status, "failed");
	}
	assert.match(app.jobs()[2].error, /No substitute accepted/);
	assert.equal(app.calls().length, 3);
});

test("background results wait for idle, pending input, and dialogs; deliver once", async (t) => {
	const app = harness(t);
	const answer = await app.execute(launch("CASE:normal", { background: true }));
	assert.equal(details(answer).jobs[0].status, "running");
	await until(() => app.jobs()[0]?.status === "completed");
	assert.equal(app.messages.length, 0);
	app.idle = true;
	app.pending = true;
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 0);
	app.pending = false;
	await app.emit("ui_prompt_start");
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 0);
	await app.emit("ui_prompt_end");
	assert.equal(app.messages.length, 1);
	assert.deepEqual(app.messages[0].options, { triggerTurn: true, deliverAs: "followUp" });
	assert.match(String(app.messages[0].content), /not instructions or user approval/);
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 1);
});

test("explicit wait returns background results without duplicating idle delivery", async (t) => {
	const app = harness(t);
	const started = await app.execute(launch("CASE:normal", { background: true }));
	const id = details(started).jobs[0].id;
	const answer = await app.execute({ action: "wait", id });
	assert.equal(details(answer).jobs[0].status, "completed");
	app.idle = true;
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 0);
});

test("cancellation kills a TERM-resistant process tree and removes its abort listener", async (t) => {
	const app = harness(t);
	const controller = new AbortController();
	const answer = app.execute(launch("CASE:hold"), controller.signal);
	await until(() => existsSync(join(app.root, "pids")));
	const pids = JSON.parse(readFileSync(join(app.root, "pids"), "utf8")) as number[];
	controller.abort();
	assert.equal(details(await answer).jobs[0].status, "cancelled");
	await until(() => pids.every((pid) => !running(pid)));
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	assert.equal(app.calls().length, 1);
});

test("timeout kills owned processes even when they ignore termination", async (t) => {
	const app = harness(t);
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const answer = app.execute(launch("CASE:hold"));
	await until(() => existsSync(join(app.root, "pids")));
	t.mock.timers.tick(600_000);
	t.mock.timers.tick(1000);
	const result = await answer;
	assert.equal(details(result).jobs[0].status, "failed");
	assert.match(details(result).jobs[0].error, /Timed out/);
	t.mock.timers.reset();
});

test("the job limit and batch validation reject new work without partly launching it", async (t) => {
	const app = harness(t);
	await assert.rejects(
		app.execute({
			action: "launch",
			tasks: [{ task: "CASE:normal" }, { task: "CASE:normal", model: "missing/model" }],
		}),
		/unavailable/,
	);
	assert.equal(app.calls().length, 0);
	const maximum = (app.tool.parameters as { properties: { tasks: { maxItems: number } } }).properties.tasks.maxItems;
	await app.execute({
		action: "launch",
		background: true,
		tasks: Array.from({ length: maximum }, () => ({ task: "CASE:hold" })),
	});
	await until(() => app.calls().length === maximum);
	await assert.rejects(app.execute(launch()), /owned jobs/);
	await app.execute({ action: "stop" });
	assert.equal(app.calls().length, maximum);
});

test("output is bounded and long saved answers can be inspected without clipping Unicode", async (t) => {
	const app = harness(t);
	const answer = await app.execute(launch("CASE:pages"));
	const id = details(answer).jobs[0].id;
	let page = details(answer).jobs[0];
	assert.ok(page.nextOffset);
	let full = page.output;
	while (page.nextOffset !== undefined) {
		const offset = page.nextOffset;
		page = details(await app.execute({ action: "inspect", id, offset })).jobs[0];
		assert.ok(page.nextOffset === undefined || page.nextOffset > offset);
		full += page.output;
	}
	assert.equal(full, "ø".repeat(26000));
	const oversized = await app.execute(launch("CASE:large"));
	assert.equal(details(oversized).jobs[0].status, "failed");
	assert.match(details(oversized).jobs[0].error, /exceeded 2 MiB/);
});

test("editing cancellation grants no permission; a confirmed editor blocks parent writes and another editor", async (t) => {
	const app = harness(t);
	app.approve = async () => false;
	await assert.rejects(
		app.execute(
			launch("CASE:hold", { edit: true, background: true, tasks: [{ task: "CASE:hold", scope: ["one.ts"] }] }),
		),
		/not approved/,
	);
	assert.equal(app.calls().length, 0);
	app.approve = async () => true;
	const started = await app.execute(
		launch("CASE:hold", { edit: true, background: true, tasks: [{ task: "CASE:hold", scope: ["one.ts"] }] }),
	);
	const id = details(started).jobs[0].id;
	assert.equal(app.confirmations, 2);
	assert.deepEqual(await app.emit("tool_call", { toolName: "write" }), {
		block: true,
		reason: `Subagent ${id} owns editing. Wait or stop it first.`,
	});
	assert.deepEqual(await app.emit("tool_call", { toolName: "bash" }), {
		block: true,
		reason: `Subagent ${id} owns editing. Wait or stop it first.`,
	});
	assert.deepEqual(await app.emit("tool_call", { toolName: "mcp__files__write" }), {
		block: true,
		reason: `Subagent ${id} owns editing. Wait or stop it first.`,
	});
	assert.deepEqual(await app.emit("tool_call", { toolName: "git_commit" }), {
		block: true,
		reason: `Subagent ${id} owns editing. Wait or stop it first.`,
	});
	assert.equal(await app.emit("tool_call", { toolName: "read" }), undefined);
	await assert.rejects(
		app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["two.ts"] }] })),
		/one editor/,
	);
	const reader = await app.execute(launch());
	assert.equal(details(reader).jobs[0].status, "completed");
	await app.execute({ action: "stop", id });
	assert.equal(await app.emit("tool_call", { toolName: "write" }), undefined);
});

test("the direct commit command refuses a running editor and releases after the editor stops", async (t) => {
	const app = harness(t);
	commit(app.api);
	await exec("git", ["init", "-b", "main"], { cwd: app.root });
	const started = await app.execute(
		launch("CASE:hold", {
			edit: true,
			background: true,
			tasks: [{ task: "CASE:hold", scope: ["one.ts"] }],
		}),
	);
	await until(() => existsSync(join(app.root, "pids")));
	await app.commit();
	assert.match(app.notices[0], /owns editing/);
	assert.equal(app.messages.length, 0);
	assert.equal(app.calls().length, 1);
	await app.execute({ action: "stop", id: details(started).jobs[0].id });
	// The fixture directory has untracked files; cancel scope selection before drafting.
	app.ctx.ui.select = async () => "Cancel";
	await app.commit();
	assert.match(String(app.messages[0].content), /cancelled/);
	assert.equal(app.calls().length, 1);
});

test("direct commit reservations block editors and defer background delivery until release", async (t) => {
	const app = harness(t);
	await app.execute(launch("CASE:normal", { background: true }));
	await until(() => app.jobs()[0]?.status === "completed");
	const claim: { id: string; phase: string; reason?: string } = { id: "command", phase: "start" };
	app.api.events.emit("ai-workflow:commit", claim);
	assert.equal(claim.reason, undefined);
	await assert.rejects(
		app.execute(
			launch("CASE:normal", {
				edit: true,
				tasks: [{ task: "CASE:normal", scope: ["one.ts"] }],
			}),
		),
		/one editor/,
	);
	app.idle = true;
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 0);
	app.api.events.emit("ai-workflow:commit", { id: "command", phase: "end" });
	await until(() => app.messages.length === 1);
	assert.equal(app.confirmations, 0);
	assert.equal(
		details(
			await app.execute(
				launch("CASE:normal", {
					edit: true,
					tasks: [{ task: "CASE:normal", scope: ["one.ts"] }],
				}),
			),
		).jobs[0].status,
		"completed",
	);
});

test("a commit reservation during editing approval invalidates that approval", async (t) => {
	const app = harness(t);
	app.approve = async () => {
		app.api.events.emit("ai-workflow:commit", { id: "command", phase: "start" });
		return true;
	};
	await assert.rejects(
		app.execute(
			launch("CASE:normal", {
				edit: true,
				tasks: [{ task: "CASE:normal", scope: ["one.ts"] }],
			}),
		),
		/changed during approval/,
	);
	assert.equal(app.calls().length, 0);
	app.api.events.emit("ai-workflow:commit", { id: "command", phase: "end" });
});

test("parent work and permission changes during approval prevent launching an editor", async (t) => {
	const app = harness(t);
	await app.emit("tool_execution_start", { toolName: "bash", toolCallId: "parent" });
	await assert.rejects(
		app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] })),
		/one editor/,
	);
	await app.emit("tool_execution_end", { toolName: "bash", toolCallId: "parent" });
	await app.emit("tool_execution_start", { toolName: "git_commit", toolCallId: "commit" });
	await assert.rejects(
		app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] })),
		/one editor/,
	);
	await app.emit("tool_execution_end", { toolName: "git_commit", toolCallId: "commit" });
	app.approve = async () => {
		await app.emit("tool_execution_start", { toolName: "edit", toolCallId: "changed" });
		return true;
	};
	await assert.rejects(
		app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] })),
		/changed during approval/,
	);
	assert.equal(app.calls().length, 0);
});

test("session replacement stops jobs; restoration does not reattach or retry running records", async (t) => {
	const app = harness(t);
	const started = await app.execute(launch("CASE:hold", { background: true }));
	const id = details(started).jobs[0].id;
	await until(() => existsSync(join(app.root, "pids")));
	const pids = JSON.parse(readFileSync(join(app.root, "pids"), "utf8")) as number[];
	await app.emit("session_before_switch");
	await until(() => pids.every((pid) => !running(pid)));
	const entries = app.manager.getBranch();
	const initial = entries.find((entry) => entry.type === "custom" && (entry.data as Job).id === id);
	assert.ok(initial);
	app.manager.branch(initial.id);
	await app.emit("session_start");
	const answer = await app.execute({ action: "status", id });
	assert.equal(details(answer).jobs[0].status, "interrupted");
	assert.equal(app.calls().length, 1);
	assert.equal(app.messages.length, 0);
	assert.equal(app.statuses.get("subagents"), undefined);
});

test("completed jobs open results directly; revisiting and closing never adds chat messages", async (t) => {
	const app = harness(t);
	await app.execute(launch());
	for (let visit = 0; visit < 2; visit++) {
		const dashboard = app.command("");
		assert.match(app.render().join("\n"), /completed/);
		app.input(ENTER);
		assert.match(app.render().join("\n"), /fixture answer/);
		assert.doesNotMatch(app.render().join("\n"), /s stop|Wait|Inspect/);
		app.input(ESC);
		app.input(ESC);
		await dashboard;
	}
	assert.equal(app.messages.length, 0);
	await app.command("stop missing");
	assert.match(app.notices[0], /Use \/subagents/);
});

test("the live strip shows short names and reported activity, never thinking or tool arguments", async (t) => {
	const app = harness(t);
	const execution = app.execute(
		launch("CASE:stream", { tasks: [{ task: "CASE:stream Full delegated instructions", label: "Review UI" }] }),
	);
	await until(() => app.widget().join("\n").includes("Tool: read"));
	const live = app.widget().join("\n");
	assert.match(live, /Review UI.*\d+s.*Tool: read/);
	assert.equal(app.widget().length, 1);
	assert.equal(app.statuses.get("subagents"), undefined);
	assert.doesNotMatch(live, /fixture\/model|unverified|Full delegated|PRIVATE/);
	const dashboard = app.command("");
	app.input(ENTER);
	assert.deepEqual(app.widget(), []);
	assert.match(app.render().join("\n"), /fixture\/model.*unverified/);
	assert.match(app.render().join("\n"), /partial report/);
	assert.doesNotMatch(app.render().join("\n"), /PRIVATE|Full delegated/);
	assert.ok(app.render().filter((line) => /^─/.test(line)).length >= 3);
	app.input("t");
	assert.match(app.render().join("\n"), /Full delegated instructions/);
	assert.doesNotMatch(app.render().join("\n"), /partial report/);
	app.input("t");
	assert.match(app.render().join("\n"), /partial report/);
	writeFileSync(join(app.root, "release"), "finish");
	const answer = await execution;
	assert.equal(details(answer).jobs[0].output, "fixture final answer");
	assert.match(app.render().join("\n"), /completed.*\d+s/);
	assert.doesNotMatch(app.render().join("\n"), /unverified|partial report|s stop|Activity:|Tool: read/);
	app.input(ESC);
	app.input(ESC);
	await dashboard;
	assert.deepEqual(app.widget(), []);
	t.mock.timers.enable({ apis: ["Date"], now: Date.now() + 90_000 });
	assert.deepEqual(app.widget(), []);
	t.mock.timers.reset();
	assert.equal(app.messages.length, 0);
});

for (const cli of ["codex", "opencode"] as const) {
	test(`${cli} activity uses structured tool names, not hidden arguments`, async (t) => {
		const app = harness(t);
		await app.execute(
			launch("CASE:stream", {
				background: true,
				tasks: [{ cli, model: "fixture/model", task: "CASE:stream", label: "Scout" }],
			}),
		);
		await until(() => app.widget().join("\n").includes("Tool:"));
		assert.match(app.widget().join("\n"), /Tool: (read|command execution)/);
		assert.doesNotMatch(app.widget().join("\n"), /PRIVATE/);
		await app.execute({ action: "stop" });
	});
}

test("running views refresh their clock and shutdown removes views and timers", async (t) => {
	const app = harness(t);
	t.mock.timers.enable({ apis: ["Date", "setInterval"], now: Date.now() });
	await app.execute(launch("CASE:stream", { background: true }));
	await until(() => app.widget().join("\n").includes("Tool: read"));
	const dashboard = app.command("");
	const before = app.redraws;
	t.mock.timers.tick(7000);
	assert.ok(app.redraws > before);
	assert.match(app.render().join("\n"), /7s/);
	assert.deepEqual(app.widget(), []);
	t.mock.timers.reset();
	await app.emit("session_shutdown");
	await dashboard;
	assert.equal(app.opened, false);
	assert.deepEqual(app.widget(), []);
	const closed = app.redraws;
	t.mock.timers.enable({ apis: ["setInterval"] });
	t.mock.timers.tick(2000);
	assert.equal(app.redraws, closed);
	t.mock.timers.reset();
});

test("Stop needs confirmation, stays visibly stopping until cleanup, and grants no extra editing", async (t) => {
	const app = harness(t);
	await app.execute(
		launch("CASE:hold", {
			background: true,
			edit: true,
			tasks: [{ task: "CASE:hold", label: "Editor", scope: ["one.ts"] }],
		}),
	);
	await until(() => existsSync(join(app.root, "pids")));
	const dashboard = app.command("");
	app.input(ENTER);
	app.input("s");
	assert.match(app.render().join("\n"), /Stop Editor\?/);
	app.input(ENTER); // Back is selected by default.
	assert.match(app.render().join("\n"), /running/);
	app.input("s");
	app.input(ESC);
	assert.match(app.render().join("\n"), /running/);
	app.input("s");
	app.input(DOWN);
	app.input(ENTER);
	assert.match(app.render().join("\n"), /stopping/);
	assert.doesNotMatch(app.render().join("\n"), /s stop/);
	assert.ok(await app.emit("tool_call", { toolName: "write" }));
	await until(() => app.jobs()[0].status === "cancelled");
	assert.match(app.render().join("\n"), /cancelled/);
	assert.equal(await app.emit("tool_call", { toolName: "write" }), undefined);
	assert.equal(app.calls().length, 1);
	assert.equal(app.confirmations, 1);
	app.input(ESC);
	app.input(ESC);
	await dashboard;
	assert.equal(app.messages.length, 0);
});

test("selection, paging and cancellation use configured keys and fit resized terminals", async (t) => {
	const app = harness(t, {
		"tui.select.down": "ctrl+n",
		"tui.select.up": "ctrl+p",
		"tui.select.confirm": "ctrl+y",
		"tui.select.cancel": "ctrl+x",
	});
	await app.execute({
		action: "launch",
		tasks: [
			{ task: "CASE:normal", label: "One" },
			{ task: "CASE:pages", label: "Two 界 👩‍💻" },
		],
	});
	const dashboard = app.command("");
	app.input(DOWN); // The default binding is no longer active.
	app.input("\x19");
	assert.match(app.render().join("\n"), /job-1/);
	app.input("\x18");
	app.input("\x0e");
	app.input("\x19");
	assert.match(app.render().join("\n"), /job-2/);
	app.input(NEXT);
	assert.match(app.render().join("\n"), /page 2\/3/);
	app.input(PAGE_DOWN);
	app.input(UP); // Defaults no longer scroll.
	for (const width of [1, 2, 12, 40, 100]) {
		app.terminal.rows = 14;
		const lines = app.render(width);
		assert.ok(lines.every((line) => visibleWidth(line) <= width));
		assert.ok(lines.length <= app.terminal.rows / 2);
		assert.ok(app.widget(width).every((line) => visibleWidth(line) <= width));
	}
	app.input("\x18");
	app.input("\x18");
	await dashboard;
});

test("failed and cleanup-unverified jobs show errors and never offer a completed-job Stop", async (t) => {
	const app = harness(t);
	await app.execute(launch("CASE:fail"));
	const dashboard = app.command("");
	app.input(ENTER);
	assert.match(app.render().join("\n"), /failed/);
	assert.match(app.render().join("\n"), /provider failed/);
	assert.doesNotMatch(app.render().join("\n"), /s stop/);
	app.input("s"); // A finished job cannot enter Stop confirmation.
	assert.doesNotMatch(app.render().join("\n"), /Stop .*\?/);
	app.input(ESC);
	app.input(ESC);
	await dashboard;
	const job = app.jobs()[0];
	app.manager.appendCustomEntry("ai-workflow-subagent", { ...job, cleanupVerified: false });
	await app.emit("session_start");
	const blocked = app.command("");
	app.input(ENTER);
	assert.match(app.render().join("\n"), /cleanup unverified/);
	assert.deepEqual(app.widget(), []);
	assert.match(app.statuses.get("subagents") ?? "", /Editing blocked.*cleanup unverified/);
	assert.ok(await app.emit("tool_call", { toolName: "write" }));
	app.input(ESC);
	app.input(ESC);
	await blocked;
	assert.match(app.widget().join("\n"), /cleanup unverified/);
});

test("history stays in the dashboard; active jobs lead, stay selected, and restore the strip on close", async (t) => {
	const app = harness(t);
	await app.execute(launch("CASE:normal", { tasks: [{ task: "CASE:normal", label: "Older history" }] }));
	assert.deepEqual(app.widget(), []);
	await app.execute(
		launch("CASE:stream", {
			background: true,
			tasks: [{ task: "CASE:stream", label: "Check the current subagent presentation" }],
		}),
	);
	await until(() => app.widget().join("\n").includes("Tool: read"));
	const dashboard = app.command("");
	const list = app.render().join("\n");
	assert.ok(list.indexOf("Check the current subagent presentation") < list.indexOf("Older history"));
	assert.doesNotMatch(list, /fixture\/model/);
	assert.deepEqual(app.widget(), []);
	app.input(ENTER);
	assert.match(app.render().join("\n"), /job-2/);
	writeFileSync(join(app.root, "release"), "finish");
	await until(() => app.jobs().every((job) => job.status === "completed"));
	assert.match(app.render().join("\n"), /job-2.*completed/);
	app.input(ESC);
	app.input(ESC);
	await dashboard;
	assert.deepEqual(app.widget(), []);
	assert.equal(app.messages.length, 0);
	rmSync(join(app.root, "release"));
	await app.execute(
		launch("CASE:stream", { background: true, tasks: [{ task: "CASE:stream", label: "Another reader" }] }),
	);
	const next = app.command("");
	app.input(ESC);
	await next;
	assert.match(app.widget().join("\n"), /Another reader/);
	assert.equal(app.statuses.get("subagents"), undefined);
	await app.execute({ action: "stop" });
});

test("task and output use separate paged views, including long tasks and narrow dividers", async (t) => {
	const app = harness(t);
	await app.execute(
		launch("CASE:normal", { tasks: [{ task: `CASE:normal ${"x".repeat(12_000)}TASK-END`, label: "Long task" }] }),
	);
	const dashboard = app.command("");
	app.input(ENTER);
	assert.match(app.render().join("\n"), /fixture answer/);
	assert.doesNotMatch(app.render().join("\n"), /TASK-END|xxx/);
	app.input("t");
	app.input(NEXT);
	assert.match(app.render().join("\n"), /Task.*page 2\/2/);
	assert.match(app.render().join("\n"), /TASK-END/);
	app.input("t");
	assert.match(app.render().join("\n"), /Output.*page 1\/1/);
	app.terminal.rows = 14;
	for (const width of [1, 2, 12, 40, 100]) {
		const lines = app.render(width);
		assert.ok(lines.every((line) => visibleWidth(line) <= width));
		assert.ok(lines.length <= 7);
	}
	app.input(ESC);
	app.input(ESC);
	await dashboard;
	assert.deepEqual(app.widget(), []);
	await app.emit("session_start");
	assert.deepEqual(app.widget(), []);
	const restored = app.command("");
	app.input(ENTER);
	assert.match(app.render().join("\n"), /fixture answer/);
	app.input(ESC);
	app.input(ESC);
	await restored;
});

test("nonterminal modes keep the tool working without terminal components", async (t) => {
	const app = harness(t);
	app.ctx.ui.setWidget = () => {
		throw new Error("terminal-only API called");
	};
	app.ctx.ui.custom = () => {
		throw new Error("terminal-only API called");
	};
	for (const mode of ["rpc", "json", "print"] as const) {
		app.ctx.mode = mode;
		const result = await app.execute(launch());
		assert.equal(details(result).jobs[0].status, "completed");
		await app.command("");
	}
	assert.equal(app.notices.length, 3);
	assert.deepEqual(app.widget(), []);
});

test("a broken terminal widget never prevents waiting for or stopping an owned job", async (t) => {
	const app = harness(t);
	app.ctx.ui.setWidget = () => {
		throw new Error("terminal disposed");
	};
	await app.execute(launch("CASE:stream", { background: true }));
	await until(() => existsSync(join(app.root, "ready")));
	const stopped = await app.execute({ action: "stop" });
	assert.equal(details(stopped).jobs[0].status, "cancelled");
	assert.equal(details(stopped).jobs[0].cleanupVerified, true);
});

test("unavailable models, nested delegation, and noninteractive edit requests start no processes", async (t) => {
	const app = harness(t);
	await assert.rejects(
		app.execute(launch("CASE:normal", { tasks: [{ task: "CASE:normal", model: "missing/model" }] })),
		/unavailable/,
	);
	await assert.rejects(
		app.execute(launch("CASE:normal", { tasks: [{ cli: "opencode", task: "CASE:normal" }] })),
		/discovered/,
	);
	if (app.ctx.model) app.ctx.model.reasoning = false;
	await assert.rejects(
		app.execute(launch("CASE:normal", { tasks: [{ task: "CASE:normal", effort: "high" }] })),
		/does not support/,
	);
	if (app.ctx.model) app.ctx.model.reasoning = true;
	app.ctx.hasUI = false;
	await assert.rejects(
		app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] })),
		/interactive/,
	);
	process.env.AI_WORKFLOW_SUBAGENT = "1";
	await assert.rejects(app.execute(launch()), /Nested/);
	assert.equal(app.calls().length, 0);
});

test("a session change during approval invalidates the approval before any process starts", async (t) => {
	const app = harness(t);
	app.approve = async () => {
		await app.emit("session_before_tree");
		app.manager.newSession();
		await app.emit("session_tree");
		return true;
	};
	await assert.rejects(
		app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] })),
		/changed during approval/,
	);
	assert.equal(app.calls().length, 0);
});

test("idle dashboard waiting consumes the result before completion can start a duplicate parent turn", async (t) => {
	const app = harness(t);
	const started = await app.execute(launch("CASE:normal", { background: true }));
	app.idle = true;
	const dashboard = app.command(`wait ${details(started).jobs[0].id}`);
	await until(() => app.opened);
	assert.match(app.render().join("\n"), /fixture answer/);
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 0);
	app.input(ESC);
	await dashboard;
	assert.equal(app.messages.length, 0);
});

test("completion updates an open dashboard; background delivery waits for it to close", async (t) => {
	const app = harness(t);
	await app.execute(launch("CASE:stream", { background: true }));
	const dashboard = app.command("");
	app.input(ENTER);
	app.idle = true;
	writeFileSync(join(app.root, "release"), "finish");
	await until(() => app.jobs().some((job) => job.status === "completed"));
	await app.emit("ui_prompt_end");
	assert.equal(app.messages.length, 0);
	assert.match(app.render().join("\n"), /fixture final answer/);
	assert.doesNotMatch(app.render().join("\n"), /s stop/);
	app.input(ESC);
	app.input(ESC);
	await dashboard;
	assert.equal(app.messages.length, 1);
	await app.emit("agent_settled");
	assert.equal(app.messages.length, 1);
});

test("storage failure does not launch work or strand a finished editor", async (t) => {
	const app = harness(t);
	app.saveFails = true;
	await assert.rejects(app.execute(launch()), /no processes started/);
	assert.equal(app.calls().length, 0);
	app.saveFails = false;
	const controller = new AbortController();
	const pending = app.execute(
		launch("CASE:hold", { edit: true, tasks: [{ task: "CASE:hold", scope: ["one.ts"] }] }),
		controller.signal,
	);
	await until(() => existsSync(join(app.root, "pids")));
	app.saveFails = true;
	controller.abort();
	const answer = await pending;
	assert.equal(details(answer).jobs[0].status, "failed");
	assert.match(details(answer).jobs[0].error, /storage failure/);
	assert.equal(await app.emit("tool_call", { toolName: "write" }), undefined);
	app.saveFails = false;
});

test("restoring a completed editor uses its last snapshot and does not retain the old lock", async (t) => {
	const app = harness(t);
	const answer = await app.execute(
		launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] }),
	);
	assert.equal(details(answer).jobs[0].cleanupVerified, true);
	await app.emit("session_start");
	assert.equal(await app.emit("tool_call", { toolName: "write" }), undefined);
	assert.equal(app.calls().length, 1);
});

for (const edit of [false, true]) {
	test(`unverifiable ${edit ? "editing" : "read-only"} cleanup blocks writes and session changes`, async (t) => {
		const app = harness(t);
		const started = await app.execute(
			launch("CASE:hold", { edit, background: true, tasks: [{ task: "CASE:hold", scope: ["one.ts"] }] }),
		);
		const id = details(started).jobs[0].id;
		await until(() => existsSync(join(app.root, "pids")));
		const ps = join(app.root, "bin", "ps");
		writeFileSync(ps, "#!/bin/sh\nexit 1\n", { mode: 0o700 });
		const answer = await app.execute({ action: "stop", id });
		assert.equal(details(answer).jobs[0].cleanupVerified, false);
		assert.equal(details(answer).jobs[0].status, "failed");
		assert.match(details(answer).jobs[0].error, /Cleanup not verified/);
		assert.ok(await app.emit("tool_call", { toolName: "write" }));
		assert.ok(await app.emit("tool_call", { toolName: "git_commit" }));
		const claim: { id: string; phase: string; reason?: string } = { id: "command", phase: "start" };
		app.api.events.emit("ai-workflow:commit", claim);
		assert.match(claim.reason ?? "", /cleanup is unverified/);
		await assert.rejects(
			app.execute(launch("CASE:normal", { edit: true, tasks: [{ task: "CASE:normal", scope: ["one.ts"] }] })),
			/Cleanup is unverified/,
		);
		assert.deepEqual(await app.emit("session_before_switch"), { cancel: true });
		rmSync(ps);
	});
}

test("blocked process inspection prevents launching a provider instead of weakening cleanup", async (t) => {
	const app = harness(t);
	writeFileSync(join(app.root, "bin", "ps"), "#!/bin/sh\nexit 1\n", { mode: 0o700 });
	await assert.rejects(app.execute(launch()), /Cannot inspect owned processes/);
	assert.equal(app.calls().length, 0);
});

test("launcher preserves text/review callers, V2 variants, and native permission flags", async (t) => {
	const app = harness(t);
	for (const cli of ["claude", "grok", "codex", "opencode", "pi"]) {
		const args = [launcher, "--review", cli, cli === "opencode" ? "provider/model" : "chosen", "high"];
		const child = exec("bash", args, { cwd: app.root, timeout: 5000 });
		child.child.stdin?.end("review fixture");
		assert.equal((await child).stdout.trim(), "plain answer");
	}
	const calls = app.calls();
	assert.equal(calls.length, 5);
	const claude = calls.find((call) => call.cli === "claude");
	assert.ok(claude?.args.includes(""));
	assert.ok(claude?.args.includes("--strict-mcp-config"));
	assert.ok(claude?.args.includes("Agent,Workflow"));
	const grok = calls.find((call) => call.cli === "grok");
	assert.ok(grok?.args.includes("read-only"));
	assert.ok(!grok?.args.includes(""));
	assert.equal(grok?.updater, "1");
	const codex = calls.find((call) => call.cli === "codex");
	assert.ok(codex?.args.includes("read-only"));
	assert.ok(codex?.args.includes("agents.enabled=false"));
	const opencode = calls.find((call) => call.cli === "opencode");
	assert.ok(opencode?.args.includes("--standalone"));
	assert.ok(opencode?.args.includes("provider/model#high"));
	assert.ok(!opencode?.args.includes("--variant"));
	const rules = JSON.parse(opencode?.config ?? "{}").agents["ai-workflow-reader"].permissions;
	assert.deepEqual(rules[0], { action: "*", resource: "*", effect: "deny" });
	assert.ok(
		rules.every(
			(rule: { action: string; effect: string }) =>
				rule.effect !== "allow" || ["read", "glob", "grep"].includes(rule.action),
		),
	);
	for (const call of calls) assert.equal(call.nested, "1");
});

test("launcher retains saved Pi permission extensions for editing without exposing delegation tools", async (t) => {
	const app = harness(t);
	const child = exec("bash", [launcher, "--edit", "pi", "chosen", "high"], { cwd: app.root, timeout: 5000 });
	child.child.stdin?.end("edit fixture");
	assert.equal((await child).stdout.trim(), "plain answer");
	const [call] = app.calls();
	assert.ok(!call.args.includes("--no-extensions"));
	assert.equal(call.nested, "1");
	const tools = call.args[call.args.indexOf("--tools") + 1].split(",");
	assert.ok(tools.includes("edit"));
	assert.ok(!tools.includes("subagent"));
	assert.ok(!tools.includes("codemode"));
});

test("launcher rejects nested calls and conflicting OpenCode overrides instead of weakening them", async (t) => {
	const app = harness(t);
	await assert.rejects(
		exec("bash", [launcher, "pi"], { cwd: app.root, env: { ...process.env, AI_WORKFLOW_SUBAGENT: "1" } }),
		/nested/,
	);
	await assert.rejects(
		exec("bash", [launcher, "opencode", "provider/model"], {
			cwd: app.root,
			env: { ...process.env, OPENCODE_CONFIG_CONTENT: '{"existing":true}' },
		}),
		/cannot combine/,
	);
	await assert.rejects(
		exec("bash", [launcher, "opencode", "provider/model#low", "high"], { cwd: app.root }),
		/not both/,
	);
	assert.equal(app.calls().length, 0);
});
