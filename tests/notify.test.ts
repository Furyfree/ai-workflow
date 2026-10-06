import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import notify from "../extensions/notify.ts";

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 180));
type Hook = (event: unknown, ctx: ExtensionContext) => unknown;

function harness(t: TestContext, mode = "tui", tty = true) {
	const previous = Object.fromEntries(
		["TERM", "TERM_PROGRAM", "KITTY_WINDOW_ID", "AI_WORKFLOW_SUBAGENT"].map((key) => [key, process.env[key]]),
	);
	process.env.TERM_PROGRAM = "ghostty";
	process.env.TERM = "xterm-ghostty";
	delete process.env.KITTY_WINDOW_ID;
	delete process.env.AI_WORKFLOW_SUBAGENT;
	const descriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
	Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: tty });
	const output: string[] = [];
	const originalWrite = process.stdout.write.bind(process.stdout);
	t.mock.method(process.stdout, "write", (text: string | Uint8Array) => {
		if (typeof text !== "string") return originalWrite(text);
		output.push(text);
		return true;
	});
	const hooks = new Map<string, Hook>();
	const channels = new Map<string, (data: unknown) => void>();
	let command: ((args: string, ctx: ExtensionCommandContext) => Promise<void>) | undefined;
	let input: ((data: string) => unknown) | undefined;
	let unsubscriptions = 0;
	let idle = true;
	let queued = false;
	const notices: string[] = [];
	const ctx = {
		mode,
		cwd: "/projects/example",
		hasUI: mode === "tui",
		isIdle: () => idle,
		hasPendingMessages: () => queued,
		ui: {
			onTerminalInput: (handler: (data: string) => unknown) => {
				input = handler;
				return () => {
					input = undefined;
					unsubscriptions++;
				};
			},
			notify: (message: string) => notices.push(message),
		},
	} as unknown as ExtensionCommandContext;
	notify({
		on: (name: string, handler: Hook) => hooks.set(name, handler),
		events: { on: (name: string, handler: (data: unknown) => void) => channels.set(name, handler) },
		registerCommand: (_name: string, value: { handler: typeof command }) => {
			command = value.handler;
		},
	} as unknown as ExtensionAPI);
	const emit = (name: string) => hooks.get(name)?.({}, ctx);
	t.after(() => {
		emit("session_shutdown");
		if (descriptor) Object.defineProperty(process.stdout, "isTTY", descriptor);
		else Reflect.deleteProperty(process.stdout, "isTTY");
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
	return {
		ctx,
		output,
		notices,
		emit,
		get unsubscriptions() {
			return unsubscriptions;
		},
		set idle(value: boolean) {
			idle = value;
		},
		set queued(value: boolean) {
			queued = value;
		},
		attention: (id: string, waiting: boolean) => channels.get("ai-workflow:attention")?.({ id, waiting }),
		input: (data: string) => input?.(data),
		command: async (args: string) => {
			assert.ok(command);
			await command(args, ctx);
		},
		alerts: () => output.filter((line) => line.includes("]777;notify;")),
	};
}

test("completion waits for settlement, combines repeated events, and uses private status text", async (t) => {
	const app = harness(t);
	app.emit("session_start");
	app.emit("agent_settled");
	app.emit("agent_settled");
	assert.equal(app.alerts().length, 0);
	await settle();
	assert.deepEqual(app.alerts(), ["\x1b]777;notify;Pi;example: Ready for input\x07"]);
});

test("focus reports suppress alerts, and real pending questions alert after focus leaves", async (t) => {
	const app = harness(t);
	app.emit("session_start");
	assert.deepEqual(app.input("\x1b[I"), { consume: true });
	assert.equal(app.input("ordinary typing"), undefined);
	app.emit("agent_settled");
	await settle();
	app.attention("question", true);
	await settle();
	assert.equal(app.alerts().length, 0);
	assert.deepEqual(app.input("\x1b[O"), { consume: true });
	await settle();
	assert.match(app.alerts()[0], /Answer needed/);
	app.attention("question", true);
	await settle();
	assert.equal(app.alerts().length, 1);
	app.attention("question", false);
	app.emit("agent_settled");
	await settle();
	assert.match(app.alerts()[1], /Ready for input/);
});

test("queued work, resumed turns, and user input cancel premature completion", async (t) => {
	const app = harness(t);
	app.emit("session_start");
	app.emit("agent_settled");
	app.queued = true;
	await settle();
	app.queued = false;
	app.emit("agent_settled");
	app.idle = false;
	await settle();
	app.idle = true;
	app.emit("agent_settled");
	app.emit("before_agent_start");
	await settle();
	app.emit("agent_settled");
	app.emit("input");
	await settle();
	assert.equal(app.alerts().length, 0);
});

test("quick answers and custom loaders or dashboards do not alert", async (t) => {
	const app = harness(t);
	app.emit("session_start");
	app.emit("ui_prompt_start"); // No generic custom-UI notification handler.
	app.attention("quick-question", true);
	app.attention("quick-question", false);
	await settle();
	assert.equal(app.alerts().length, 0);
});

test("commands toggle this runtime; test bypasses off and focus without enabling alerts", async (t) => {
	const app = harness(t);
	app.emit("session_start");
	await app.command("off");
	app.emit("agent_settled");
	await settle();
	app.input("\x1b[I");
	await app.command("test");
	assert.equal(app.alerts().length, 1);
	assert.match(app.alerts()[0], /Notification test/);
	await app.command("unknown");
	assert.match(app.notices.at(-1) ?? "", /Usage/);
	app.input("\x1b[O");
	app.emit("agent_settled");
	await settle();
	assert.equal(app.alerts().length, 1);
	await app.command("on");
	app.emit("agent_settled");
	await settle();
	assert.equal(app.alerts().length, 2);
});

test("reload and shutdown release focus reporting and discard stale alerts", async (t) => {
	const app = harness(t);
	app.emit("session_start");
	app.attention("old-session-question", true);
	app.emit("session_start");
	await settle();
	assert.equal(app.unsubscriptions, 1);
	assert.equal(app.alerts().length, 0);
	app.emit("agent_settled");
	app.emit("session_shutdown");
	await settle();
	assert.equal(app.unsubscriptions, 2);
	assert.equal(app.alerts().length, 0);
	assert.equal(app.output.filter((line) => line === "\x1b[?1004l").length, 2);
});

test("RPC, print, JSON, and redirected output emit no terminal sequences", async (t) => {
	const app = harness(t, "rpc");
	for (const mode of ["rpc", "print", "json"] as const) {
		app.ctx.mode = mode;
		app.emit("session_start");
		app.emit("agent_settled");
		await app.command("test");
		await settle();
	}
	app.ctx.mode = "tui";
	Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false });
	app.emit("session_start");
	await app.command("test");
	assert.deepEqual(app.output, []);
});

test("explicit child marker suppresses notifications; unknown terminals fail without escape output", async (t) => {
	const app = harness(t);
	process.env.AI_WORKFLOW_SUBAGENT = "1";
	app.emit("session_start");
	await app.command("test");
	assert.deepEqual(app.output, []);
	delete process.env.AI_WORKFLOW_SUBAGENT;
	process.env.TERM_PROGRAM = "unknown";
	process.env.TERM = "xterm";
	app.emit("session_start");
	assert.deepEqual(app.output, []);
	assert.match(app.notices.at(-1) ?? "", /unsupported terminal/);
});

test("OSC fields strip controls and separators from repository names", async (t) => {
	const app = harness(t);
	app.ctx.cwd = "/projects/example;\x1b]777;injected\x07";
	app.emit("session_start");
	await app.command("test");
	assert.equal(app.alerts().length, 1);
	assert.equal(app.alerts()[0].split("]777;").length, 2);
	assert.equal(app.alerts()[0].split("\x07").length, 2);
});
