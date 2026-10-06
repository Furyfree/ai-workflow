import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type TestContext, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
	initTheme,
	type Theme,
} from "@earendil-works/pi-coding-agent";
import {
	type Component,
	getCapabilities,
	KeybindingsManager,
	setCapabilities,
	stripTerminalSequences,
	type Terminal,
	type TUI,
	TUI_KEYBINDINGS,
	visibleWidth,
} from "@earendil-works/pi-tui";
import imagePreview from "../extensions/image-preview.ts";

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
	"base64",
);
const ENTER = "\r";
const UNDO = "\x1b[45;5u";
const LEFT = "\x1b[D";
const RIGHT = "\x1b[C";
const HOME = "\x01";
const END = "\x05";
type Factory = NonNullable<Parameters<ExtensionContext["ui"]["setEditorComponent"]>[0]>;
type Hook = (event: unknown, ctx: ExtensionContext) => unknown;

function harness(t: TestContext) {
	const root = mkdtempSync(join(tmpdir(), "ai-workflow-preview-"));
	const caps = getCapabilities();
	setCapabilities({ ...caps, images: "kitty" });
	initTheme("dark", false);
	const hooks = new Map<string, Hook>();
	const keys = new KeybindingsManager(TUI_KEYBINDINGS);
	const settings: ReturnType<ExtensionAPI["getSettings"]> = { terminal: { showImages: true } };
	const submitted: string[] = [];
	const notices: string[] = [];
	const terminal = { rows: 24 };
	const tui = { terminal, requestRender() {} } as unknown as TUI;
	const colour = (text: string) => text;
	const theme = { fg: (_role: string, text: string) => text } as Theme;
	const editorTheme = {
		borderColor: colour,
		selectList: {
			selectedPrefix: colour,
			selectedText: colour,
			description: colour,
			scrollInfo: colour,
			noMatch: colour,
		},
	};
	const native = new CustomEditor(tui, editorTheme, keys as Parameters<Factory>[2]);
	native.onSubmit = (text) => submitted.push(text);
	let editor = native;
	let factory: Factory | undefined;
	let widget: Component | undefined;
	const ctx = {
		cwd: root,
		mode: "tui",
		ui: {
			theme,
			getEditorComponent: () => factory,
			getEditorText: () => editor.getExpandedText(),
			setEditorText: (text: string) => editor.setText(text),
			setEditorComponent: (next: Factory | undefined) => {
				const draft = editor.getText(); // Pi copies getText(), not getExpandedText(), when swapping editors.
				factory = next;
				editor = next ? (next(tui, editorTheme, keys as Parameters<Factory>[2]) as CustomEditor) : native;
				editor.onSubmit = native.onSubmit;
				editor.onChange = native.onChange;
				editor.setText(draft);
			},
			setWidget: (_id: string, content: Parameters<ExtensionContext["ui"]["setWidget"]>[1]) => {
				widget = typeof content === "function" ? content(tui, theme) : undefined;
			},
			notify: (text: string) => notices.push(text),
		},
	} as unknown as ExtensionContext;
	imagePreview({
		on: (name: string, hook: Hook) => hooks.set(name, hook),
		getSettings: () => settings,
	} as unknown as ExtensionAPI);
	const emit = (name: string) => hooks.get(name)?.({}, ctx);
	t.after(() => {
		emit("session_shutdown");
		setCapabilities(caps);
		rmSync(root, { recursive: true, force: true });
	});
	emit("session_start");
	return {
		root,
		ctx,
		settings,
		terminal,
		submitted,
		notices,
		emit,
		get editor() {
			return editor;
		},
		get native() {
			return editor === native;
		},
		paste: (path: string) => editor.insertTextAtCursor(path),
		picture: (name = "picture.png") => {
			const path = join(root, name);
			writeFileSync(path, PNG);
			return path;
		},
		render: (width = 80) => editor.render(width).map(stripTerminalSequences),
		preview: (width = 80) => widget?.render(width) ?? [],
	};
}

test("pasted images show short labels and graphics while all public text getters retain original paths", (t) => {
	const app = harness(t);
	const path = app.picture("design with spaces.png");
	app.editor.setText("Inspect ");
	app.paste(path);
	assert.match(app.render().join("\n"), /\[image #1\]/);
	assert.doesNotMatch(app.render().join("\n"), /ai-workflow-preview-/);
	assert.ok(app.preview().some((line) => line.includes("\x1b_G")));
	assert.equal(app.editor.getText(), `Inspect ${path}`);
	assert.equal(app.editor.getExpandedText(), `Inspect ${path}`);
	assert.deepEqual(app.editor.getLines(), [`Inspect ${path}`]);
	assert.equal(app.editor.getCursor().col, `Inspect ${path}`.length);
	app.editor.handleInput("!");
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput(ENTER);
	assert.deepEqual(app.submitted, [`Inspect ${path}!`]);
	assert.deepEqual(app.preview(), []);
	assert.deepEqual(readFileSync(path), PNG);
});

test("the input cursor selects one image and hides the preview over ordinary text", (t) => {
	const app = harness(t);
	const first = app.picture("first.png");
	const second = app.picture("second.png");
	app.editor.setText("Check ");
	app.paste(first);
	app.editor.handleInput(" and ");
	app.paste(second);
	assert.match(app.preview().join("\n"), /second.png/);
	assert.doesNotMatch(app.preview().join("\n"), /first.png|more images/);
	assert.ok(app.preview().some((line) => line.includes("\x1b_G")));
	app.editor.handleInput(HOME);
	assert.deepEqual(app.preview(), []);
	for (let i = 0; i < 6; i++) app.editor.handleInput(RIGHT);
	assert.match(app.preview().join("\n"), /first.png/);
	assert.doesNotMatch(app.preview().join("\n"), /second.png/);
	app.editor.handleInput(RIGHT); // Inside the first label.
	assert.match(app.preview().join("\n"), /first.png/);
	for (let i = 0; i < 9; i++) app.editor.handleInput(RIGHT);
	assert.match(app.preview().join("\n"), /first.png/); // Immediately after the label.
	app.editor.handleInput(RIGHT);
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput(LEFT);
	assert.match(app.preview().join("\n"), /first.png/);
	app.editor.handleInput(END);
	assert.match(app.preview().join("\n"), /second.png/);
	app.editor.handleInput(ENTER);
	assert.deepEqual(app.submitted, [`Check ${first} and ${second}`]);
	assert.deepEqual(app.preview(), []);
});

test("adjacent and repeated labels select the label starting at the cursor before the preceding one", (t) => {
	const app = harness(t);
	const first = app.picture("first.png");
	const second = app.picture("second.png");
	app.paste(first);
	app.paste(second);
	app.paste(first);
	assert.match(app.preview().join("\n"), /first.png/);
	app.editor.handleInput(HOME);
	for (let i = 0; i < 10; i++) app.editor.handleInput(RIGHT);
	assert.match(app.preview().join("\n"), /second.png/);
	assert.doesNotMatch(app.preview().join("\n"), /first.png/);
	for (let i = 0; i < 10; i++) app.editor.handleInput(RIGHT);
	assert.match(app.preview().join("\n"), /first.png/);
	assert.doesNotMatch(app.preview().join("\n"), /second.png/);
	app.editor.handleInput(END);
	app.editor.handleInput(" [image #99]");
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput(ENTER);
	assert.deepEqual(app.submitted, [`${first}${second}${first} [image #99]`]);
});

test("cursor selection uses logical lines and character offsets even with wide text and wrapping", (t) => {
	const app = harness(t);
	const first = app.picture("first.png");
	const second = app.picture("second.png");
	app.editor.setText("界🙂 ");
	app.paste(first);
	app.editor.insertTextAtCursor("\ntext\n");
	app.paste(second);
	app.render(7);
	assert.match(app.preview().join("\n"), /second.png/);
	app.editor.handleInput("\x1b[A"); // Still inside the wrapped second label.
	assert.match(app.preview().join("\n"), /second.png/);
	app.editor.handleInput(END);
	app.render();
	app.editor.handleInput("\x1b[A");
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput("\x1b[A");
	assert.match(app.preview().join("\n"), /first.png/);
	assert.doesNotMatch(app.preview().join("\n"), /second.png/);
	app.editor.handleInput(HOME);
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput(END);
	assert.match(app.preview().join("\n"), /first.png/);
	assert.deepEqual(app.editor.getLines(), [`界🙂 ${first}`, "text", second]);
	assert.equal(app.editor.getCursor().col, `界🙂 ${first}`.length);
});

test("unselected thumbnails load only when the cursor reaches their label", (t) => {
	const app = harness(t);
	const first = join(app.root, "first.png");
	writeFileSync(first, "not an image yet");
	const second = app.picture("second.png");
	app.editor.setText(`${first}\n${second}`);
	writeFileSync(first, PNG);
	app.editor.handleInput(HOME);
	app.editor.handleInput("\x1b[A");
	assert.match(app.preview().join("\n"), /first.png/);
	assert.ok(app.preview().some((line) => line.includes("\x1b_G")));
	assert.doesNotMatch(app.preview().join("\n"), /second.png/);
});

test("deleting part of an image label hides its preview and undo restores it", (t) => {
	const app = harness(t);
	const path = app.picture();
	app.paste(path);
	app.editor.handleInput("\x7f");
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput(UNDO);
	assert.equal(app.editor.getExpandedText(), path);
	assert.ok(app.preview().some((line) => line.includes("\x1b_G")));
});

test("mouse hover leaves cursor selection alone while a click moves the input cursor", (t) => {
	const app = harness(t);
	const first = app.picture("first.png");
	const second = app.picture("second.png");
	app.paste(first);
	app.editor.handleInput(" ");
	app.paste(second);
	app.render();
	const event = {
		type: "move" as const,
		button: "none" as const,
		x: 0,
		y: 1,
		screenX: 0,
		screenY: 1,
		width: 80,
		height: 3,
		shift: false,
		alt: false,
		ctrl: false,
	};
	app.editor.handleMouse(event);
	assert.match(app.preview().join("\n"), /second.png/);
	assert.doesNotMatch(app.preview().join("\n"), /first.png/);
	app.editor.handleMouse({ ...event, type: "click", button: "left" });
	assert.match(app.preview().join("\n"), /first.png/);
	assert.doesNotMatch(app.preview().join("\n"), /second.png/);
});

test("multiple and repeated attachments expand once without rewriting marker-like text inside filenames", (t) => {
	const app = harness(t);
	const first = app.picture("literal [image #2].png");
	const second = app.picture("second.png");
	app.paste(first);
	app.editor.handleInput(" ");
	app.paste(second);
	app.editor.handleInput(" ");
	app.paste(first);
	app.editor.handleInput(" [image #99]");
	app.editor.handleInput(ENTER);
	assert.deepEqual(app.submitted, [`${first} ${second} ${first} [image #99]`]);
});

test("undo, history and dialog draft restoration recover attachments without losing surrounding edits", (t) => {
	const app = harness(t);
	const path = app.picture();
	app.editor.setText("Before ");
	app.paste(path);
	app.editor.handleInput(UNDO);
	assert.equal(app.editor.getExpandedText(), "Before ");
	assert.deepEqual(app.preview(), []);
	app.paste(path);
	const saved = app.editor.getText();
	app.editor.setText("");
	assert.deepEqual(app.preview(), []);
	app.editor.setText(saved);
	assert.match(app.render().join("\n"), /\[image #1\]/);
	assert.equal(app.editor.getExpandedText(), saved);
	app.editor.addToHistory(saved);
	app.editor.handleInput(ENTER);
	app.editor.handleInput("\x1b[A");
	assert.equal(app.editor.getExpandedText(), saved);
	assert.match(app.render().join("\n"), /\[image #1\]/);
	assert.deepEqual(app.preview(), []); // History places the cursor before the ordinary text.
	app.editor.handleInput(END);
	assert.ok(app.preview().some((line) => line.includes("\x1b_G")));
});

test("disabled and unsupported image rendering keeps filename-only previews and original submissions", (t) => {
	const app = harness(t);
	const path = app.picture();
	const caps = getCapabilities();
	for (const mode of ["hidden", "disabled", "unsupported", "iterm2"] as const) {
		if (app.settings.terminal) {
			app.settings.terminal.showImages = mode !== "hidden";
			app.settings.terminal.images = mode === "disabled" ? false : "auto";
		}
		setCapabilities({ ...caps, images: mode === "unsupported" ? null : mode === "iterm2" ? "iterm2" : "kitty" });
		app.editor.setText("");
		app.paste(path);
		if (mode === "iterm2") assert.ok(app.preview().some((line) => line.includes("]1337;File=")));
		else for (const line of app.preview()) assert.ok(!line.includes("\x1b"));
		assert.match(app.preview().join("\n"), /picture.png/);
		app.editor.handleInput(ENTER);
		assert.equal(app.submitted.at(-1), path);
	}
});

test(
	"missing, invalid, huge and nonregular image paths fall back without modifying files or blocking input",
	{ timeout: 2000 },
	(t) => {
		const app = harness(t);
		const paths = [
			join(app.root, "missing.png"),
			join(app.root, "invalid.png"),
			join(app.root, "huge.png"),
			join(app.root, "directory.png"),
		];
		writeFileSync(paths[1], "not an image");
		writeFileSync(paths[2], "");
		truncateSync(paths[2], 1024 ** 3);
		mkdirSync(paths[3]);
		const zero = join(app.root, "zero-width.png");
		const invalidDimensions = Buffer.from(PNG);
		invalidDimensions.writeUInt32BE(0, 16);
		writeFileSync(zero, invalidDimensions);
		paths.push(zero);
		if (process.platform !== "win32") {
			const pipe = join(app.root, "pipe.png");
			execFileSync("mkfifo", [pipe]);
			paths.push(pipe);
		}
		for (const path of paths) {
			app.paste(path);
			assert.ok(app.preview().length);
			assert.ok(app.preview().every((line) => !line.includes("\x1b_G")));
			app.editor.handleInput(ENTER);
			assert.equal(app.submitted.at(-1), path);
		}
		assert.equal(readFileSync(paths[1], "utf8"), "not an image");
	},
);

test("previews fit narrow terminals and stay bounded with many attachments", (t) => {
	const app = harness(t);
	for (let i = 0; i < 12; i++) {
		app.paste(app.picture(`image-${i}.png`));
		app.editor.handleInput(" ");
	}
	assert.deepEqual(app.preview(), []);
	app.editor.handleInput(LEFT);
	assert.match(app.preview().join("\n"), /\[image #12\]/);
	assert.doesNotMatch(app.preview().join("\n"), /\[image #[1-9]\]|more images/);
	for (const rows of [6, 24, 60]) {
		app.terminal.rows = rows;
		for (const width of [1, 7, 30, 80]) {
			const lines = app.preview(width);
			assert.ok(lines.length <= Math.min(8, Math.floor(rows / 3)));
			for (const line of lines) if (!line.includes("\x1b_G")) assert.ok(visibleWidth(line) <= width);
		}
	}
	assert.deepEqual(app.preview(0), []);
	app.editor.setText("");
	assert.deepEqual(app.preview(), []);
});

test("editor replacement and session restart restore paths before releasing attachment mappings", (t) => {
	const app = harness(t);
	const path = join(tmpdir(), `pi-clipboard-${randomUUID()}.png`);
	writeFileSync(path, PNG);
	t.after(() => rmSync(path, { force: true }));
	app.editor.setText("Inspect ");
	app.paste(path);
	const saved = `Inspect ${path}`;
	app.emit("session_start");
	assert.equal(app.editor.getExpandedText(), saved);
	assert.match(app.render().join("\n"), /\[image #1\]/);
	app.emit("session_shutdown");
	assert.equal(app.native, true);
	assert.equal(app.editor.getText(), saved);
	assert.deepEqual(app.preview(), []);
});

test("nonterminal sessions leave their editor alone and another custom editor is never replaced", (t) => {
	const app = harness(t);
	app.emit("session_shutdown");
	app.ctx.ui.setEditorComponent = () => {
		throw new Error("terminal API called");
	};
	for (const mode of ["rpc", "json", "print"] as const) {
		app.ctx.mode = mode;
		app.emit("session_start");
		app.emit("session_shutdown");
	}
	app.ctx.mode = "tui";
	app.ctx.ui.getEditorComponent = () => () => app.editor;
	app.emit("session_start");
	assert.equal(app.notices.length, 1);
	app.ctx.mode = "print"; // Cleanup must not call the deliberately failing terminal API.
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
	"native Pi submits original paths, restores drafts after dialogs and reload, and cleans image placements",
	{ timeout: 20_000 },
	async (t) => {
		const home = mkdtempSync(join(tmpdir(), "ai-workflow-native-preview-"));
		const agentDir = join(home, ".pi", "agent");
		mkdirSync(agentDir, { recursive: true });
		const path = join(tmpdir(), `pi-clipboard-${randomUUID()}.png`);
		const second = join(home, "second.png");
		writeFileSync(path, PNG);
		writeFileSync(second, PNG);
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
				rmSync(path, { force: true });
				rmSync(home, { recursive: true, force: true });
			}
		});
		const pi = await import("@earendil-works/pi-coding-agent");
		const received: string[] = [];
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
					settingsManager: pi.SettingsManager.inMemory({
						theme: "dark",
						quietStartup: true,
						terminal: { images: "kitty", showImages: true },
					}),
					resourceLoaderOptions: {
						noExtensions: true,
						noSkills: true,
						noPromptTemplates: true,
						noThemes: true,
						noContextFiles: true,
						additionalExtensionPaths: [fileURLToPath(new URL("../extensions/image-preview.ts", import.meta.url))],
						extensionFactories: [
							(api) => {
								api.registerCommand("capture-image-context", {
									handler: async (_args, context) => {
										ctx = context;
									},
								});
								api.on("input", (event) => {
									received.push(event.text);
									return { action: "handled" };
								});
							},
						],
					},
				});
				assert.deepEqual(services.resourceLoader.getExtensions().errors, []);
				return {
					...(await pi.createAgentSessionFromServices({ services, sessionManager, tools: [] })),
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
		await runtime.session.prompt("/capture-image-context");
		assert.ok(ctx);
		const screen = () => {
			const renderer = (
				mode as unknown as {
					renderer: { mode: string; previousLines?: string[]; previousScreen?: string[] };
				}
			).renderer;
			return (
				(renderer.mode === "fullscreen" ? renderer.previousScreen : renderer.previousLines)?.slice(-terminal.rows) ?? []
			)
				.map(stripTerminalSequences)
				.join("\n");
		};
		for (const tuiMode of ["regular", "fullscreen"] as const) {
			(mode as unknown as { switchTuiMode(mode: string): void }).switchTuiMode(tuiMode);
			ctx.ui.setEditorText("Inspect ");
			ctx.ui.pasteToEditor(path);
			await rendered();
			assert.equal(ctx.ui.getEditorText(), `Inspect ${path}`);
			assert.match(terminal.output, /\[image #1\]/);
			assert.ok(terminal.output.includes("\x1b_G"));
			ctx.ui.pasteToEditor(" ");
			ctx.ui.pasteToEditor(second);
			await rendered();
			assert.match(screen(), /second.png/);
			assert.doesNotMatch(screen(), /image 1.png/);
			terminal.output = "";
			terminal.send(HOME);
			await rendered();
			assert.doesNotMatch(screen(), /image 1.png|second.png/);
			assert.ok(terminal.output.includes("\x1b_Ga=d"), `${tuiMode}: moving onto text deletes Kitty placements`);
			for (let i = 0; i < 8; i++) terminal.send(RIGHT);
			await rendered();
			assert.match(screen(), /image 1.png/);
			assert.doesNotMatch(screen(), /second.png/);
			terminal.send(END);
			await rendered();
			assert.match(screen(), /second.png/);
			assert.doesNotMatch(screen(), /image 1.png/);
			let finish: (() => void) | undefined;
			const dialog = ctx.ui.custom<void>((_tui, _theme, _keys, done) => {
				finish = done;
				return { render: () => ["Temporary dialog"], invalidate() {} };
			});
			await rendered();
			assert.ok(finish);
			finish();
			await dialog;
			assert.equal(ctx.ui.getEditorText(), `Inspect ${path} ${second}`);
			await rendered();
			assert.match(screen(), /second.png/);
			assert.doesNotMatch(screen(), /image 1.png/);
			terminal.output = "";
			const submitted = mode.getUserInput();
			terminal.send(ENTER);
			const text = await submitted;
			assert.equal(text, `Inspect ${path} ${second}`);
			await runtime.session.prompt(text);
			await rendered();
			assert.equal(received.at(-1), `Inspect ${path} ${second}`);
			assert.equal(ctx.ui.getEditorText(), "");
			assert.ok(terminal.output.includes("\x1b_Ga=d"), `${tuiMode}: removed preview deletes Kitty placements`);
		}
		ctx.ui.setEditorText(`Inspect ${path}`);
		const previousFactory = ctx.ui.getEditorComponent();
		await ctx.reload();
		await runtime.session.prompt("/capture-image-context");
		assert.ok(ctx);
		assert.notEqual(ctx.ui.getEditorComponent(), previousFactory);
		await rendered();
		assert.equal(ctx.ui.getEditorText(), `Inspect ${path}`);
		const submitted = mode.getUserInput();
		terminal.send(ENTER);
		await runtime.session.prompt(await submitted);
		await rendered();
		assert.equal(received.at(-1), `Inspect ${path}`);
		assert.deepEqual(readFileSync(path), PNG);
	},
);
