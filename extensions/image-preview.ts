import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, isAbsolute, join } from "node:path";
import { CustomEditor, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	getCapabilities,
	getImageDimensions,
	Image,
	stripTerminalSequences,
	truncateToWidth,
} from "@earendil-works/pi-tui";

const WIDGET = "ai-workflow-image-preview";
const MAX_BYTES = 8 * 1024 * 1024;
const MIME: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
};
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clipboardPath = new RegExp(
	`${escapeRegex(join(tmpdir(), "pi-clipboard-"))}[a-f0-9-]{36}\\.(?:png|jpe?g|gif|webp)(?![\\w.-])`,
	"gi",
);

type Attachment = { path: string; label: string; name: string; image?: Image; loaded: boolean };
type EditorFactory = NonNullable<Parameters<ExtensionContext["ui"]["setEditorComponent"]>[0]>;

function thumbnail(path: string, ctx: ExtensionContext, pi: ExtensionAPI): Image | undefined {
	let fd: number | undefined;
	try {
		// Nonblocking open rejects pipes without hanging the prompt; reads stay bounded even if a file grows.
		fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
		const stat = fstatSync(fd);
		if (!stat.isFile() || stat.size < 1 || stat.size > MAX_BYTES) return;
		const bytes = Buffer.alloc(stat.size);
		if (readSync(fd, bytes, 0, bytes.length, 0) !== bytes.length) return;
		const mime = MIME[extname(path).toLowerCase()];
		const data = bytes.toString("base64");
		const dimensions = getImageDimensions(data, mime);
		if (
			!dimensions ||
			dimensions.widthPx < 1 ||
			dimensions.heightPx < 1 ||
			dimensions.widthPx * dimensions.heightPx > 40_000_000
		)
			return;
		return new Image(
			data,
			mime,
			{ fallbackColor: (text) => ctx.ui.theme.fg("muted", text) },
			{
				maxWidthCells: Math.min(24, pi.getSettings().terminal?.imageWidthCells ?? 60),
				maxHeightCells: 2,
				filename: basename(path),
			},
			dimensions,
		);
	} catch {
		// Missing, unreadable, or invalid files still submit their original paths.
		return;
	} finally {
		if (fd !== undefined) closeSync(fd);
	}
}

export default function imagePreview(pi: ExtensionAPI) {
	let factory: EditorFactory | undefined;
	let clear: (() => void) | undefined;
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		if (ctx.ui.getEditorComponent() && ctx.ui.getEditorComponent() !== factory) {
			clear?.();
			clear = undefined;
			factory = undefined;
			ctx.ui.notify("Image previews need Pi's default editor; another editor extension is active.", "warning");
			return;
		}
		if (factory && ctx.ui.getEditorComponent() === factory) ctx.ui.setEditorComponent(undefined);
		clear?.();
		factory = (tui, theme, keys) => {
			const attachments = new Map<string, Attachment>();
			let sequence = 0;
			let widget = false;
			const allowed = () =>
				pi.getSettings().terminal?.showImages !== false &&
				pi.getSettings().terminal?.images !== false &&
				!!getCapabilities().images;
			const expand = (text: string) =>
				text.replace(
					/\[image #\d+\]/g,
					(label) => [...attachments.values()].find((entry) => entry.label === label)?.path ?? label,
				);
			const shorten = (text: string) => {
				const candidates = [...text.matchAll(clipboardPath)].map((match) => match[0]);
				for (const line of text.split(/\r?\n/)) {
					const candidate = line.trim().replace(/^(["'])(.*)\1$/, "$2");
					if (isAbsolute(candidate) && MIME[extname(candidate).toLowerCase()] && !/\p{Cc}/u.test(candidate))
						candidates.push(candidate);
				}
				for (const path of candidates) {
					if (!attachments.has(path)) {
						const id = ++sequence;
						attachments.set(path, {
							path,
							label: `[image #${id}]`,
							loaded: false,
							name: basename(path).startsWith("pi-clipboard-") ? `image ${id}${extname(path)}` : basename(path),
						});
					}
				}
				for (const entry of attachments.values()) {
					const pattern = new RegExp(`(?<![\\w/.-])${escapeRegex(entry.path)}(?![\\w/.-])`, "g");
					text = text.replace(pattern, () => entry.label);
				}
				return text;
			};
			class PreviewEditor extends CustomEditor {
				getText() {
					return expand(super.getText());
				}
				getExpandedText() {
					return expand(super.getExpandedText());
				}
				getLines() {
					return super.getLines().map(expand);
				}
				getCursor() {
					const cursor = super.getCursor();
					const line = super.getLines()[cursor.line] ?? "";
					return { line: cursor.line, col: expand(line.slice(0, cursor.col)).length };
				}
				setText(text: string) {
					super.setText(shorten(text));
					this.refresh();
				}
				insertTextAtCursor(text: string) {
					super.insertTextAtCursor(shorten(text));
					this.refresh();
				}
				addToHistory(text: string) {
					super.addToHistory(shorten(text));
				}
				handleInput(data: string) {
					if (data.startsWith("\x1b[200~") && data.endsWith("\x1b[201~")) {
						data = `\x1b[200~${shorten(data.slice(6, -6))}\x1b[201~`;
					}
					const submit = this.onSubmit;
					if (submit) this.onSubmit = (text) => submit(expand(text));
					try {
						super.handleInput(data);
					} finally {
						this.onSubmit = submit;
						this.refresh();
					}
				}
				handleMouse(event: Parameters<CustomEditor["handleMouse"]>[0]) {
					const result = super.handleMouse(event);
					if (event.type === "click") this.refresh();
					return result;
				}
				refresh() {
					// Selection uses visible labels and their raw cursor offsets, not expanded file paths.
					const cursor = super.getCursor();
					const line = super.getLines()[cursor.line] ?? "";
					const labels = [...line.matchAll(/\[image #\d+\]/g)];
					const label =
						labels.find((match) => match.index <= cursor.col && cursor.col < match.index + match[0].length) ??
						labels.find((match) => cursor.col === match.index + match[0].length);
					const selected = [...attachments.values()].find((entry) => entry.label === label?.[0]);
					for (const entry of attachments.values()) {
						if (entry !== selected) {
							entry.image = undefined;
							entry.loaded = false;
						} else if (!entry.loaded && allowed()) {
							entry.image = thumbnail(entry.path, ctx, pi);
							entry.loaded = true;
						}
					}
					if (!selected) {
						if (widget) ctx.ui.setWidget(WIDGET, undefined);
						widget = false;
						return;
					}
					ctx.ui.setWidget(
						WIDGET,
						(_tui, colours) => ({
							invalidate() {
								selected.image?.invalidate();
							},
							render(width) {
								if (width < 1) return [];
								const budget = Math.max(1, Math.min(8, Math.floor(tui.terminal.rows / 3)));
								const label = truncateToWidth(
									colours.fg(
										"muted",
										`${selected.label} ${stripTerminalSequences(selected.name).replace(/\p{Cc}/gu, " ")}`,
									),
									width,
								);
								const image = allowed() && width >= 4 ? (selected.image?.render(width) ?? []) : [];
								return 1 + image.length <= budget ? [label, ...image] : [label];
							},
						}),
						{ placement: "aboveEditor" },
					);
					widget = true;
				}
			}
			const editor = new PreviewEditor(tui, theme, keys, { embedWorkingStatus: true });
			clear = () => {
				if (widget) ctx.ui.setWidget(WIDGET, undefined);
				widget = false;
				attachments.clear();
			};
			return editor;
		};
		ctx.ui.setEditorComponent(factory);
	});
	pi.on("session_shutdown", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		// Pi copies getText() into its default editor, so restore it before dropping path mappings.
		if (factory && ctx.ui.getEditorComponent() === factory) ctx.ui.setEditorComponent(undefined);
		clear?.();
		clear = undefined;
		factory = undefined;
	});
}
