import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type TestContext, test } from "node:test";
import { fileURLToPath } from "node:url";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionToolContext,
	Theme,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import {
	type Component,
	CURSOR_MARKER,
	getKeybindings,
	KeybindingsManager,
	setKeybindings,
	type Terminal,
	type TUI,
	TUI_KEYBINDINGS,
	visibleWidth,
} from "@earendil-works/pi-tui";
import question from "../extensions/question.ts";

const UP = "\x1b[A";
const DOWN = "\x1b[B";
const ENTER = "\r";
const ESC = "\x1b";
const BACK = "\x1b[Z";
type Question = {
	question: string;
	options: { label: string; description?: string; recommended?: boolean }[];
};
const choice = (text = "Which approach?"): Question => ({
	question: text,
	options: [{ label: "Small", description: "Keep the change focused", recommended: true }, { label: "Large" }],
});
type Answer = { question: string; answer: string; wasCustom: boolean; index?: number };
type Details = { answers: Answer[]; cancelled: boolean };
type Prompt = Component & { focused?: boolean; dispose?(): void };

function harness(t: TestContext, bindings = {}) {
	let tool: ToolDefinition | undefined;
	const attention: unknown[] = [];
	question({
		events: { emit: (_channel: string, data: unknown) => attention.push(data) },
		registerTool: (value: ToolDefinition) => {
			tool = value;
		},
	} as unknown as ExtensionAPI);
	assert.ok(tool);
	const previousKeys = getKeybindings();
	const keys = new KeybindingsManager(TUI_KEYBINDINGS, bindings);
	setKeybindings(keys);
	t.after(() => setKeybindings(previousKeys));
	const theme = { fg: (_key: string, text: string) => text, bold: (text: string) => text } as Theme;
	const terminal = { rows: 40 };
	const tui = { terminal, requestRender() {} } as unknown as TUI;
	let prompt: Prompt | undefined;
	let completions = 0;
	let beforeFactory = () => {};
	const ctx = {
		mode: "tui",
		hasUI: true,
		ui: {
			custom: (factory: Parameters<ExtensionToolContext["ui"]["custom"]>[0]) =>
				new Promise((resolve) => {
					beforeFactory();
					const component = factory(tui, theme, keys as Parameters<typeof factory>[2], (value) => {
						completions++;
						prompt?.dispose?.();
						resolve(value);
					});
					assert.ok(!(component instanceof Promise));
					prompt = component;
					prompt.focused = true;
				}),
		},
	} as unknown as ExtensionToolContext;
	const registered = tool;
	return {
		tool: registered,
		attention,
		ctx,
		terminal,
		get completions() {
			return completions;
		},
		set beforeFactory(value: () => void) {
			beforeFactory = value;
		},
		execute: (questions = [choice()], signal?: AbortSignal) =>
			registered.execute("test", { questions }, signal, undefined, ctx),
		input: (data: string) => {
			assert.ok(prompt);
			prompt.handleInput?.(data);
		},
		render: (width = 80) => {
			assert.ok(prompt);
			return prompt.render(width);
		},
		focus: (value: boolean) => {
			assert.ok(prompt);
			prompt.focused = value;
		},
		get opened() {
			return prompt !== undefined;
		},
	};
}

test("one question returns the chosen answer and shows its recommendation and description", async (t) => {
	const app = harness(t);
	assert.equal(app.tool.exposure, "model-only");
	assert.equal(app.tool.executionMode, "sequential");
	const execution = app.execute();
	assert.match(app.render().join("\n"), /Small.*Recommended/);
	assert.match(app.render().join("\n"), /Keep the change focused/);
	app.input(DOWN);
	app.input(ENTER);
	const result = await execution;
	assert.deepEqual((result.details as Details).answers, [
		{ question: "Which approach?", answer: "Large", wasCustom: false, index: 2 },
	]);
});

test("a prewritten chain waits for the last answer and going back replaces an earlier answer", async (t) => {
	const app = harness(t);
	let returned = false;
	const execution = app.execute([choice("Scope?"), choice("Checks?"), choice("Deploy?")]).then((result) => {
		returned = true;
		return result;
	});
	app.input(ENTER);
	await Promise.resolve();
	assert.equal(returned, false);
	assert.match(app.render().join("\n"), /Checks\?/);
	app.input(BACK);
	assert.match(app.render().join("\n"), /Scope\?/);
	app.input(DOWN);
	app.input(ENTER);
	app.input(ENTER);
	app.input(DOWN);
	app.input(ENTER);
	assert.deepEqual((await execution).details as Details, {
		questions: [choice("Scope?"), choice("Checks?"), choice("Deploy?")],
		answers: [
			{ question: "Scope?", answer: "Large", wasCustom: false, index: 2 },
			{ question: "Checks?", answer: "Small", wasCustom: false, index: 1 },
			{ question: "Deploy?", answer: "Large", wasCustom: false, index: 2 },
		],
		cancelled: false,
	});
});

test("Back row preserves selection and custom drafts survive leaving and revisiting a question", async (t) => {
	const app = harness(t);
	const execution = app.execute([choice("First?"), choice("Second?")]);
	app.input(ENTER);
	app.input(DOWN);
	app.input(DOWN);
	app.input(ENTER);
	app.input("my draft");
	app.input(BACK);
	app.input(ENTER);
	assert.match(app.render().join("\n"), /my draft/);
	app.input(ESC);
	app.input(DOWN);
	app.input(ENTER); // Back row
	app.input(ENTER);
	app.input(UP);
	app.input(ENTER); // Reopen custom answer
	assert.match(app.render().join("\n"), /my draft/);
	app.input(ENTER);
	assert.equal(((await execution).details as Details).answers[1].answer, "my draft");
});

test("blank custom input does not submit; the focused editor positions the cursor and submits real text", async (t) => {
	const app = harness(t);
	let returned = false;
	const execution = app.execute().then((result) => {
		returned = true;
		return result;
	});
	app.input(DOWN);
	app.input(DOWN);
	app.input(ENTER);
	app.input(ENTER);
	await Promise.resolve();
	assert.equal(returned, false);
	app.input("  café 界  ");
	assert.ok(app.render().some((line) => line.includes(CURSOR_MARKER)));
	app.focus(false);
	assert.ok(app.render().every((line) => !line.includes(CURSOR_MARKER)));
	app.focus(true);
	assert.ok(app.render().some((line) => line.includes(CURSOR_MARKER)));
	app.input(ENTER);
	assert.deepEqual(((await execution).details as Details).answers, [
		{ question: "Which approach?", answer: "café 界", wasCustom: true },
	]);
});

test("selection keys and custom submission honour remapped Pi bindings", async (t) => {
	const app = harness(t, {
		"tui.select.down": "ctrl+n",
		"tui.select.up": "ctrl+p",
		"tui.select.confirm": "ctrl+y",
		"tui.select.cancel": "ctrl+x",
		"tui.input.submit": "ctrl+s",
	});
	const execution = app.execute();
	app.input(DOWN); // Default no longer selects another option
	app.input("\x0e");
	app.input("\x0e");
	app.input("\x19");
	app.input("typed");
	app.input("\x13");
	assert.equal(((await execution).details as Details).answers[0].answer, "typed");
});

test("cancelling after an earlier answer discards the whole chain and removes the abort listener", async (t) => {
	const app = harness(t);
	const controller = new AbortController();
	const execution = app.execute([choice("First?"), choice("Second?")], controller.signal);
	app.input(ENTER);
	app.input(ESC);
	const result = await execution;
	assert.equal((result.details as Details).cancelled, true);
	assert.deepEqual((result.details as Details).answers, []);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	assert.deepEqual(app.attention, [
		{ id: "question:test", waiting: true },
		{ id: "question:test", waiting: false },
	]);
	controller.abort();
	app.input(ENTER);
	assert.equal(app.completions, 1);
});

test("caller abort closes an active custom editor and ignores subsequent input", async (t) => {
	const app = harness(t);
	const controller = new AbortController();
	const execution = app.execute(undefined, controller.signal);
	app.input(DOWN);
	app.input(DOWN);
	app.input(ENTER);
	app.input("not submitted");
	controller.abort();
	assert.deepEqual(((await execution).details as Details).answers, []);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	app.input(ENTER);
	assert.equal(app.completions, 1);
});

test("already-aborted calls open nothing, and abort before the UI factory cannot leave a pending prompt", async (t) => {
	const first = harness(t);
	const controller = new AbortController();
	controller.abort();
	assert.equal(((await first.execute(undefined, controller.signal)).details as Details).cancelled, true);
	assert.equal(first.opened, false);
	const second = harness(t);
	const later = new AbortController();
	second.beforeFactory = () => later.abort();
	assert.equal(((await second.execute(undefined, later.signal)).details as Details).cancelled, true);
	assert.equal(getEventListeners(later.signal, "abort").length, 0);
});

test("successful answers release the abort listener, and an abort before the result resumes rejects a late answer", async (t) => {
	const app = harness(t);
	const controller = new AbortController();
	const execution = app.execute(undefined, controller.signal);
	app.input(ENTER);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	controller.abort();
	assert.equal(((await execution).details as Details).cancelled, true);
	assert.equal(app.completions, 1);
});

test("non-terminal modes and invalid questions fail without opening a prompt", async (t) => {
	const app = harness(t);
	for (const mode of ["rpc", "print", "json"] as const) {
		app.ctx.mode = mode;
		await assert.rejects(app.execute(), /interactive terminal/);
	}
	app.ctx.mode = "tui";
	for (const questions of [
		[],
		[{ ...choice(), question: " " }],
		[{ ...choice(), options: [] }],
		[{ ...choice(), options: [{ label: "Same" }, { label: "Same" }] }],
		[
			{
				...choice(),
				options: [
					{ label: "A", recommended: true },
					{ label: "B", recommended: true },
				],
			},
		],
	]) {
		await assert.rejects(app.execute(questions));
	}
	assert.equal(app.opened, false);
	assert.deepEqual(app.attention, []);
});

test("narrow and height-only resize keep the selection and custom cursor within terminal bounds", async (t) => {
	const app = harness(t);
	const controller = new AbortController();
	const q = {
		...choice(),
		options: Array.from({ length: 4 }, (_, i) => ({
			label: `Choice ${i + 1} 界`,
			description: "Long explanation ".repeat(15),
		})),
	};
	const execution = app.execute([q], controller.signal);
	try {
		app.render();
		app.input(DOWN);
		app.input(DOWN);
		app.input(DOWN);
		assert.match(app.render().join("\n"), /> 4\. Choice 4/);
		for (const width of [80, 30, 8, 1]) {
			app.terminal.rows = 15;
			const lines = app.render(width);
			assert.ok(lines.length <= app.terminal.rows);
			assert.ok(lines.every((line) => visibleWidth(line) <= width));
			if (width >= 30) assert.match(lines.join("\n"), /> 4\. Choice 4/);
		}
		app.input(DOWN);
		app.input(ENTER);
		app.input(`${"word ".repeat(100)}CURSOR-END`);
		for (const rows of [40, 15, 10]) {
			app.terminal.rows = rows;
			const lines = app.render(30);
			assert.ok(lines.some((line) => line.includes(CURSOR_MARKER)));
			assert.match(lines.join("\n"), /CURSOR-END/);
			assert.ok(lines.length <= rows);
		}
	} finally {
		controller.abort();
		await execution;
	}
});

test("paging reads long choices without changing the answer", async (t) => {
	const app = harness(t);
	app.terminal.rows = 15;
	const longLabel = `${"words ".repeat(150)}LABEL-END`;
	const execution = app.execute([{ ...choice(), options: [{ label: longLabel }, { label: "Short" }] }]);
	assert.ok(!app.render(30).join("\n").includes("LABEL-END"));
	for (let i = 0; i < 20 && !app.render(30).join("\n").includes("LABEL-END"); i++) app.input("\x1b[6;2~");
	assert.match(app.render(30).join("\n"), /LABEL-END/);
	app.input(ENTER);
	assert.equal(((await execution).details as Details).answers[0].answer, longLabel);
});

class MemoryTerminal implements Terminal {
	columns = 80;
	rows = 24;
	kittyProtocolActive = false;
	output = "";
	input?: (data: string) => void;
	resized?: () => void;
	start(input: (data: string) => void, resized: () => void) {
		this.input = input;
		this.resized = resized;
	}
	stop() {
		this.input = undefined;
		this.resized = undefined;
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
	"Pi's native terminal UI restores the chat draft and keyboard ownership after answer, cancel, and abort",
	{ timeout: 20_000 },
	async (t) => {
		const home = mkdtempSync(join(tmpdir(), "ai-workflow-question-"));
		const agentDir = join(home, ".pi", "agent");
		mkdirSync(agentDir, { recursive: true });
		const previous = { HOME: process.env.HOME, PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR };
		process.env.HOME = home;
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
				rmSync(home, { recursive: true, force: true });
			}
		});
		const pi = await import("@earendil-works/pi-coding-agent");
		let ctx: ExtensionCommandContext | undefined;
		const modelRuntime = await pi.ModelRuntime.create({
			authPath: join(agentDir, "auth.json"),
			modelsPath: null,
			allowModelNetwork: false,
		});
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
						additionalExtensionPaths: [fileURLToPath(new URL("../extensions/question.ts", import.meta.url))],
						extensionFactories: [
							(api) => {
								api.registerCommand("question-test", {
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
					...(await pi.createAgentSessionFromServices({ services, sessionManager, tools: ["question"] })),
					services,
					diagnostics: services.diagnostics,
				};
			},
			{ cwd: home, agentDir, sessionManager: pi.SessionManager.inMemory(home) },
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
		await runtime.session.prompt("/question-test");
		assert.ok(ctx);
		const ui = ctx.ui;
		const tool = runtime.session.agent.state.tools.find((value) => value.name === "question");
		assert.ok(tool);
		const screen = () => {
			const renderer = (
				mode as unknown as {
					renderer: { mode: string; previousLines?: string[]; previousScreen?: string[] };
				}
			).renderer;
			return (
				(renderer.mode === "fullscreen" ? renderer.previousScreen : renderer.previousLines)?.slice(-terminal.rows) ?? []
			);
		};
		for (const tuiMode of ["regular", "fullscreen"] as const) {
			(mode as unknown as { switchTuiMode(mode: string): void }).switchTuiMode(tuiMode);
			for (const action of ["answer", "cancel", "abort"] as const) {
				ui.setEditorText("unfinished chat");
				await rendered();
				terminal.output = "";
				const controller = new AbortController();
				const execution: Promise<{ details: unknown }> = tool.execute(
					`native-${action}`,
					{ questions: [choice()] },
					controller.signal,
				);
				try {
					await rendered();
					assert.match(terminal.output, /Which approach\?/);
					terminal.rows = 15;
					terminal.resized?.();
					await rendered();
					if (action === "answer") {
						terminal.send(DOWN);
						terminal.send(ENTER);
					} else if (action === "cancel") terminal.send(ESC);
					else controller.abort();
					const result = await execution;
					assert.equal((result.details as Details).cancelled, action !== "answer");
					assert.deepEqual(
						(result.details as Details).answers.map((a) => a.answer),
						action === "answer" ? ["Large"] : [],
					);
					assert.equal(ui.getEditorText(), "unfinished chat");
					terminal.send("!");
					assert.equal(ui.getEditorText(), "unfinished chat!");
				} finally {
					controller.abort();
					await execution;
					terminal.rows = 24;
					terminal.resized?.();
				}
			}
			const controller = new AbortController();
			const questions = [choice("First choice?"), choice("Then what?")];
			questions[0].options[0].description = `${"Explanation ".repeat(100)}DESCRIPTION-END`;
			ui.setEditorText("keep this draft");
			const execution: Promise<{ details: unknown }> = tool.execute("native-chain", { questions }, controller.signal);
			try {
				await rendered();
				for (let i = 0; i < 30 && !screen().some((line) => line.includes("DESCRIPTION-END")); i++) {
					terminal.send("\x1b[6;2~");
					await rendered();
				}
				assert.ok(
					screen().some((line) => line.includes("DESCRIPTION-END")),
					`${tuiMode}: shifted paging reaches the description`,
				);
				terminal.send(ENTER);
				await rendered();
				terminal.send(DOWN);
				terminal.send(DOWN);
				terminal.send(ENTER);
				terminal.send("custom answer");
				terminal.rows = 15;
				terminal.columns = 30;
				terminal.resized?.();
				await rendered();
				assert.ok(
					screen().some((line) => line.includes("custom answer")),
					`${tuiMode}: custom answer remains on screen after resize`,
				);
				terminal.send(BACK);
				await rendered();
				terminal.send(ENTER);
				await rendered();
				assert.ok(
					screen().some((line) => line.includes("custom answer")),
					`${tuiMode}: returning preserves the custom draft`,
				);
				terminal.send(ENTER);
				assert.deepEqual(
					((await execution).details as Details).answers.map((a) => a.answer),
					["Small", "custom answer"],
				);
				assert.equal(ui.getEditorText(), "keep this draft");
			} finally {
				controller.abort();
				await execution;
				terminal.rows = 24;
				terminal.columns = 80;
				terminal.resized?.();
			}
		}
	},
);
