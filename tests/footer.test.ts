import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import type { ContextUsage, ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import footer from "../extensions/footer.ts";

type Factory = NonNullable<Parameters<ExtensionContext["ui"]["setFooter"]>[0]>;
type Hook = (event: never, ctx: ExtensionContext) => unknown;

function model(provider = "openai", id = "example-model") {
	return { provider, id, reasoning: true, contextWindow: 128_000 } as NonNullable<ExtensionContext["model"]>;
}

function harness() {
	const hooks = new Map<string, Hook>();
	const watchers = new Set<() => void>();
	const statuses = new Map<string, string>();
	const colours: { role: string; text: string }[] = [];
	let view: ReturnType<Factory> | undefined;
	let branch: string | null = "feature";
	let usage: ContextUsage | undefined = { tokens: 32_000, percent: 25, contextWindow: 128_000 };
	let redraws = 0;
	let changes = 0;
	const theme = {
		fg: (role: string, text: string) => {
			colours.push({ role, text });
			return `\x1b[${role === "warning" ? 33 : role === "error" ? 31 : 2}m${text}\x1b[0m`;
		},
	} as Theme;
	const ctx = {
		cwd: "/scratch/project",
		mode: "tui",
		model: model(),
		thinkingLevel: "medium",
		getContextUsage: () => usage,
		ui: {
			setFooter: (factory: Factory | undefined) => {
				changes++;
				view?.dispose?.();
				view = factory?.({ requestRender: () => redraws++ } as unknown as TUI, theme, {
					getGitBranch: () => branch,
					getAvailableProviderCount: () => 2,
					getExtensionStatuses: () => statuses,
					onBranchChange: (callback: () => void) => {
						watchers.add(callback);
						return () => watchers.delete(callback);
					},
				});
			},
		},
	} as unknown as ExtensionContext;
	footer({
		on: (name: string, hook: Hook) => hooks.set(name, hook),
		getThinkingLevel: () => "medium",
	} as unknown as ExtensionAPI);
	return {
		ctx,
		statuses,
		colours,
		watchers,
		emit: (name: string, event = {}) => hooks.get(name)?.(event as never, ctx),
		render: (width = 160) => view?.render(width).map(stripTerminalSequences) ?? [],
		get changes() {
			return changes;
		},
		get redraws() {
			return redraws;
		},
		set usage(value: ContextUsage | undefined) {
			usage = value;
		},
		set branch(value: string | null) {
			branch = value;
			for (const callback of watchers) callback();
		},
	};
}

function clock(t: TestContext) {
	const app = harness();
	let now = 0;
	t.mock.method(performance, "now", () => now);
	t.mock.timers.enable({ apis: ["setInterval"] });
	t.after(() => app.emit("session_shutdown"));
	return {
		app,
		advance: (ms: number) => {
			now += ms;
			t.mock.timers.tick(ms);
		},
		skip: (ms: number) => {
			now += ms;
		},
	};
}

test("elapsed prompt time includes tools and answer waits and does not depend on counting timer ticks", (t) => {
	const { app, advance, skip } = clock(t);
	app.emit("session_start");
	assert.doesNotMatch(app.render().join("\n"), /⏱/);
	app.emit("agent_start");
	assert.match(app.render()[0], /⏱ 0s/);
	advance(4000);
	app.emit("tool_execution_start");
	advance(6000);
	app.emit("tool_execution_end");
	app.emit("ui_prompt_start");
	advance(10_000);
	app.emit("ui_prompt_end");
	assert.match(app.render()[0], /⏱ 20s/);
	const before = app.redraws;
	skip(63_000); // The display's ticker can be delayed while elapsed time keeps advancing.
	assert.equal(app.redraws, before);
	assert.match(app.render()[0], /⏱ 1m23s/);
	advance(1000);
	assert.ok(app.redraws > before);
	assert.match(app.render()[0], /⏱ 1m24s/);
});

test("retries, automatic compaction and queued input never restart the current prompt clock", (t) => {
	const { app, advance } = clock(t);
	app.emit("session_start");
	app.emit("agent_start");
	advance(2000);
	app.emit("agent_end");
	advance(3000);
	app.emit("agent_start");
	assert.match(app.render()[0], /⏱ 5s/);
	app.emit("session_before_compact");
	advance(4000);
	app.emit("session_compact");
	app.emit("agent_start");
	app.emit("input", { source: "interactive", streamingBehavior: "followUp", text: "Another queued request" });
	advance(1000);
	app.emit("agent_start");
	assert.match(app.render()[0], /⏱ 10s/);
	app.emit("agent_settled");
	const stopped = app.redraws;
	advance(60_000);
	assert.match(app.render()[0], /⏱ 10s/);
	assert.equal(app.redraws, stopped);
	app.emit("agent_start");
	assert.match(app.render()[0], /⏱ 0s/);
	advance(3000);
	assert.match(app.render()[0], /⏱ 3s/);
});

test("an interrupted prompt freezes after final cleanup and cannot leave its ticker running", (t) => {
	const { app, advance } = clock(t);
	app.emit("session_start");
	app.emit("agent_start");
	advance(3000);
	app.emit("agent_end", { messages: [{ role: "assistant", stopReason: "aborted" }] });
	advance(1000);
	app.emit("agent_settled");
	assert.match(app.render()[0], /⏱ 4s/);
	app.emit("agent_settled");
	const stopped = app.redraws;
	advance(5000);
	assert.match(app.render()[0], /⏱ 4s/);
	assert.equal(app.redraws, stopped);
});

test("provider switches stop hidden tickers without resetting the prompt; session changes clear the clock", (t) => {
	const { app, advance } = clock(t);
	app.emit("session_start");
	app.emit("agent_start");
	advance(1000);
	app.emit("model_select", { model: model("anthropic") });
	const hidden = app.redraws;
	advance(3000);
	assert.equal(app.redraws, hidden);
	app.emit("model_select", { model: model() });
	assert.match(app.render()[0], /⏱ 4s/);
	advance(1000);
	assert.match(app.render()[0], /⏱ 5s/);
	for (const event of ["session_tree", "session_start"]) {
		app.emit(event);
		assert.doesNotMatch(app.render().join("\n"), /⏱/);
		const idle = app.redraws;
		advance(2000);
		assert.equal(app.redraws, idle);
		app.emit("agent_start");
		advance(1000);
	}
	app.emit("session_shutdown");
	const stopped = app.redraws;
	advance(5000);
	assert.equal(app.redraws, stopped);
	assert.deepEqual(app.render(), []);
	assert.equal(app.watchers.size, 0);
});

test("a long-running clock remains inline and narrow layouts keep its time and context capacity visible", (t) => {
	const { app, advance } = clock(t);
	app.emit("session_start");
	app.emit("agent_start");
	advance(83_000);
	assert.equal(app.render().length, 1);
	for (const width of [20, 36]) {
		const lines = app.render(width);
		assert.equal(lines.length, 2);
		assert.match(lines.join("\n"), /25\.0%\/128k/);
		assert.match(lines.join("\n"), /⏱ 1m23s/);
	}
	advance(3_578_000);
	assert.match(app.render().join("\n"), /⏱ 1h1m1s/);
	for (const width of [1, 7, 20, 36, 160]) {
		for (const line of app.render(width)) assert.ok(visibleWidth(line) <= width);
	}
});

test("only OpenAI and legacy Codex replace the native footer; switches and shutdown release branch watchers", () => {
	const app = harness();
	app.ctx.model = model("anthropic");
	app.emit("session_start");
	assert.equal(app.changes, 0);
	const next = model();
	app.emit("model_select", { model: next }); // Selection can precede ctx.model updating.
	assert.match(app.render().join("\n"), /example-model/);
	app.ctx.model = next;
	assert.equal(app.watchers.size, 1);
	for (const provider of ["openrouter", "anthropic"]) {
		app.emit("model_select", { model: model(provider) });
		assert.deepEqual(app.render(), []);
		assert.equal(app.watchers.size, 0);
		for (const supported of ["openai", "openai-codex"]) {
			app.emit("model_select", { model: model(supported) });
			assert.match(app.render().join("\n"), /example-model/);
			assert.equal(app.watchers.size, 1);
		}
	}
	app.emit("session_start");
	assert.equal(app.watchers.size, 1);
	app.emit("session_shutdown");
	assert.deepEqual(app.render(), []);
	assert.equal(app.watchers.size, 0);
});

test("rendering reads live branch, reasoning, context and Fast state without an extra Fast row", () => {
	const app = harness();
	app.emit("session_start");
	assert.equal(app.render().length, 1);
	assert.match(app.render()[0], /project \(feature\).*25\.0%\/128k.*example-model.*medium/);
	app.branch = "release";
	app.ctx.thinkingLevel = "low";
	app.usage = { tokens: 50_000, percent: 50, contextWindow: 100_000 };
	app.statuses.set("ai-workflow-fast", "Fast: on");
	assert.ok(app.redraws > 0);
	assert.equal(app.render().length, 1);
	assert.match(app.render()[0], /\(release\).*50\.0%\/100k.*low.*fast/);
	app.statuses.set("ai-workflow-fast", "Fast: off");
	assert.doesNotMatch(app.render().join("\n"), /fast/i);
	app.branch = null;
	assert.doesNotMatch(app.render().join("\n"), /\(release\)/);
	app.statuses.set("ai-workflow-fast", "Fast: on");
	app.ctx.model = model("openai-codex", "another-model");
	app.emit("model_select", { model: app.ctx.model });
	assert.match(app.render().join("\n"), /another-model.*fast/);
});

test("unknown context keeps its capacity until usage returns; high usage retains warning colours", () => {
	const app = harness();
	app.emit("session_start");
	app.usage = { tokens: null, percent: null, contextWindow: 200_000 };
	assert.match(app.render().join("\n"), /\?\/200k/);
	app.usage = undefined;
	assert.match(app.render().join("\n"), /\?\/128k/);
	for (const [percent, role] of [
		[82, "warning"],
		[97, "error"],
	] as const) {
		app.usage = { tokens: percent * 1000, percent, contextWindow: 100_000 };
		app.colours.length = 0;
		app.render();
		assert.ok(app.colours.some((value) => value.role === role && value.text.includes(`${percent}.0%/100k`)));
	}
});

test("narrow and resized terminals retain context; wide text and active extension statuses fit", () => {
	const app = harness();
	app.ctx.cwd = "/scratch/a-very-long-project-根é-name";
	app.statuses.set("subagents", "Subagents: 2 · editing blocked until cleanup completes");
	app.emit("session_start");
	const narrow = app.render(36);
	assert.match(narrow[0], /25\.0%\/128k/);
	assert.match(narrow[1], /example-model/);
	assert.match(narrow.slice(2).join(" "), /Subagents: 2.*editing/);
	for (const width of [1, 7, 20, 36, 160]) {
		for (const line of app.render(width)) assert.ok(visibleWidth(line) <= width);
	}
	assert.deepEqual(app.render(0), []);
	app.statuses.clear();
	assert.equal(app.render().length, 1);
	app.ctx.cwd = "/scratch/new-project";
	app.emit("session_tree");
	assert.match(app.render()[0], /new-project/);
	assert.equal(app.watchers.size, 1);
});

test("text fields cannot inject terminal controls or extra lines", () => {
	const app = harness();
	app.ctx.cwd = "/scratch/project\n\x1b]0;injected\x07";
	app.branch = "branch\tname";
	app.statuses.set("notice", "inspect\nchanges\x07");
	app.emit("session_start");
	const lines = app.render();
	assert.equal(lines.length, 2);
	for (const line of lines) assert.doesNotMatch(line, /\p{Cc}/u);
	assert.doesNotMatch(lines.join(" "), /injected/);
	assert.match(lines[1], /inspect changes/);
});

test("RPC, JSON and print modes never replace terminal components", () => {
	const app = harness();
	app.ctx.ui.setFooter = () => {
		throw new Error("terminal API called");
	};
	for (const mode of ["rpc", "json", "print"] as const) {
		app.ctx.mode = mode;
		app.emit("session_start");
		app.emit("model_select", { model: model() });
		app.emit("agent_start");
		app.emit("agent_settled");
		app.emit("session_tree");
		app.emit("session_shutdown");
	}
	assert.equal(app.changes, 0);
});
