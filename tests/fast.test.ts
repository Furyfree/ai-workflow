import assert from "node:assert/strict";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type TestContext, test } from "node:test";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionContext,
	ExtensionEvent,
	RegisteredCommand,
} from "@earendil-works/pi-coding-agent";
import fast from "../extensions/fast.ts";

type Hook = (event: ExtensionEvent, ctx: ExtensionContext) => unknown;

function model(provider = "openai-codex", id = "example-codex") {
	return { provider, id, api: "openai-codex-responses" } as NonNullable<ExtensionContext["model"]>;
}

function harness(t: TestContext, agentDir = mkdtempSync(join(tmpdir(), "ai-workflow-fast-"))) {
	t.after(() => rmSync(agentDir, { recursive: true, force: true }));
	const hooks = new Map<string, Hook>();
	const commands = new Map<string, Omit<RegisteredCommand, "name" | "sourceInfo">>();
	const statuses = new Map<string, string | undefined>();
	const notices: { message: string; type: string }[] = [];
	const ctx = {
		cwd: join(agentDir, "project-a"),
		mode: "tui",
		hasUI: true,
		model: model(),
		ui: {
			setStatus: (key: string, text: string | undefined) => statuses.set(key, text),
			notify: (message: string, type: string) => notices.push({ message, type }),
		},
	} as unknown as ExtensionCommandContext;
	const pi = {
		on: (name: string, handler: Hook) => {
			hooks.set(name, handler);
			return () => hooks.delete(name);
		},
		registerCommand: (name: string, command: Omit<RegisteredCommand, "name" | "sourceInfo">) =>
			commands.set(name, command),
	} as unknown as ExtensionAPI;

	const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
	try {
		process.env.PI_CODING_AGENT_DIR = agentDir;
		fast(pi);
	} finally {
		if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
	}

	async function emit(event: ExtensionEvent) {
		const handler = hooks.get(event.type);
		assert.ok(handler, `Missing handler for ${event.type}`);
		return handler(event, ctx);
	}
	async function command(args = "") {
		const registered = commands.get("fast");
		assert.ok(registered, "Missing /fast command");
		await registered.handler(args, ctx);
	}
	return {
		agentDir,
		statePath: join(agentDir, "state", "ai-workflow-fast.json"),
		ctx,
		notices,
		statuses,
		emit,
		command,
		start: () => emit({ type: "session_start", reason: "startup" }),
		request: (payload: unknown) => emit({ type: "before_provider_request", payload }),
		select: async (next: NonNullable<ExtensionContext["model"]>) => {
			const previousModel = ctx.model;
			// Pi may still expose the previous model in ctx during the selection event.
			await emit({ type: "model_select", model: next, previousModel, source: "set" });
			ctx.model = next;
		},
	};
}

test("starts off; status and invalid commands never save or enable priority", async (t) => {
	const app = harness(t);
	await app.start();
	assert.equal(app.statuses.get("ai-workflow-fast"), "Fast: off");
	assert.equal(await app.request({ model: "example-codex" }), undefined);
	await app.command("status");
	await app.command("unexpected");
	assert.equal(app.notices.at(-1)?.type, "error");
	assert.equal(await app.request({}), undefined);
	assert.equal(existsSync(app.statePath), false);
});

test("toggle requests priority for any Codex model without altering reasoning or input", async (t) => {
	const app = harness(t);
	const settingsPath = join(app.agentDir, "settings.json");
	writeFileSync(settingsPath, '{"unrelated":true}\n');
	app.statuses.set("another-extension", "keep this");
	await app.start();
	await app.command();
	assert.equal(app.statuses.get("ai-workflow-fast"), "Fast: on");
	assert.equal(app.statuses.get("another-extension"), "keep this");
	assert.ok(app.notices.some(({ type, message }) => type === "warning" && /extra usage/.test(message)));
	for (const id of ["gpt-5.4", "future-codex-model", "another-variant"]) {
		await app.select(model("openai-codex", id));
		const payload = Object.freeze({
			model: id,
			reasoning: { effort: "high", summary: "auto" },
			text: { verbosity: "low" },
			input: [{ role: "user", content: "hello" }],
		});
		const result = await app.request(payload);
		assert.deepEqual(result, { ...payload, service_tier: "priority" });
		assert.equal(Object.hasOwn(payload, "service_tier"), false);
	}
	assert.equal(readFileSync(settingsPath, "utf8"), '{"unrelated":true}\n');
	assert.deepEqual(readdirSync(join(app.agentDir, "state")), ["ai-workflow-fast.json"]);
	if (process.platform !== "win32") assert.equal(statSync(app.statePath).mode & 0o777, 0o600);
	await app.command();
	assert.equal(app.statuses.get("ai-workflow-fast"), "Fast: off");
	assert.equal(await app.request({}), undefined);
});

test("remembers on and off across new runtimes, projects, and reloads", async (t) => {
	const first = harness(t);
	await first.start();
	await first.command("on");
	const second = harness(t, first.agentDir);
	second.ctx.cwd = join(first.agentDir, "project-b");
	await second.start();
	assert.deepEqual(await second.request({}), { service_tier: "priority" });
	await second.command("on");
	assert.deepEqual(await second.request({}), { service_tier: "priority" });
	await second.command("off");
	await second.command("off");
	await first.emit({ type: "session_start", reason: "reload" });
	assert.equal(await first.request({}), undefined);
	assert.equal(first.statuses.get("ai-workflow-fast"), "Fast: off");
	const third = harness(t, first.agentDir);
	await third.start();
	assert.equal(await third.request({}), undefined);
});

test("shows Fast only on Codex models and retains the choice across provider switches", async (t) => {
	const app = harness(t);
	app.ctx.model = model("anthropic");
	await app.start();
	assert.equal(app.statuses.get("ai-workflow-fast"), undefined);
	for (const enabled of [true, false]) {
		await app.select(model());
		await app.command(enabled ? "on" : "off");
		for (const provider of ["openai", "anthropic"]) {
			await app.select(model(provider));
			assert.equal(app.statuses.get("ai-workflow-fast"), undefined);
			assert.equal(await app.request({ service_tier: "default" }), undefined);
		}
		await app.select(model());
		assert.equal(app.statuses.get("ai-workflow-fast"), enabled ? "Fast: on" : "Fast: off");
		assert.deepEqual(await app.request({}), enabled ? { service_tier: "priority" } : undefined);
		app.ctx.model = undefined;
		await app.start();
		assert.equal(app.statuses.get("ai-workflow-fast"), undefined);
		await app.select(model());
		assert.equal(app.statuses.get("ai-workflow-fast"), enabled ? "Fast: on" : "Fast: off");
	}
});

test("malformed, future, and unreadable state fail off with a warning", async (t) => {
	const app = harness(t);
	mkdirSync(join(app.agentDir, "state"));
	for (const contents of ["{", "null", '{"version":1,"enabled":"true"}', '{"version":2,"enabled":true}']) {
		writeFileSync(app.statePath, contents);
		await app.start();
		assert.equal(await app.request({}), undefined);
		assert.equal(app.statuses.get("ai-workflow-fast"), "Fast: off");
		assert.equal(app.notices.at(-1)?.type, "warning");
	}
	rmSync(app.statePath);
	mkdirSync(app.statePath);
	await app.start();
	assert.equal(await app.request({}), undefined);
	assert.match(app.notices.at(-1)?.message ?? "", /Could not read/);
});

test("failed saving preserves the user's process choice and cleans temporary files", async (t) => {
	const app = harness(t);
	await app.start();
	mkdirSync(app.statePath, { recursive: true });
	const sentinel = join(app.statePath, "keep");
	writeFileSync(sentinel, "untouched");
	await app.command("on");
	assert.equal(app.statuses.get("ai-workflow-fast"), "Fast: on");
	assert.deepEqual(await app.request({}), { service_tier: "priority" });
	assert.match(app.notices.at(-1)?.message ?? "", /could not save/);
	assert.equal(readFileSync(sentinel, "utf8"), "untouched");
	assert.deepEqual(readdirSync(join(app.agentDir, "state")), ["ai-workflow-fast.json"]);
	await app.command("off");
	assert.equal(await app.request({}), undefined);
	assert.equal(app.statuses.get("ai-workflow-fast"), "Fast: off");
});

test("invalid payloads pass through; tier conflicts request priority and warn once", async (t) => {
	const app = harness(t);
	await app.start();
	await app.command("on");
	const initialWarnings = app.notices.filter(({ type }) => type === "warning").length;
	for (const payload of [null, [], "not an object"]) {
		assert.equal(await app.request(payload), undefined);
	}
	assert.equal(app.notices.filter(({ type }) => type === "warning").length, initialWarnings + 1);
	const payload = Object.freeze({ service_tier: "default", other: "keep" });
	assert.deepEqual(await app.request(payload), { service_tier: "priority", other: "keep" });
	assert.equal(payload.service_tier, "default");
	assert.deepEqual(await app.request(payload), { service_tier: "priority", other: "keep" });
	assert.equal(app.notices.filter(({ type }) => type === "warning").length, initialWarnings + 2);
	assert.deepEqual(await app.request({ service_tier: "priority" }), { service_tier: "priority" });
});

test("RPC and print requests work without using terminal-only status rendering", async (t) => {
	const app = harness(t);
	for (const mode of ["rpc", "print"] as const) {
		app.ctx.mode = mode;
		app.ctx.hasUI = mode === "rpc";
		await app.start();
		await app.command("on");
		assert.deepEqual(await app.request({}), { service_tier: "priority" });
		assert.equal(app.statuses.size, 0);
		await app.command("off");
		assert.equal(await app.request({}), undefined);
	}
});
