// Adapted from Pi v1.0.3's question.ts and questionnaire.ts examples.
// MIT notice: extensions/THIRD_PARTY_NOTICES in ai-workflow.

import type { ExtensionAPI, KeybindingsManager } from "@earendil-works/pi-coding-agent";
import {
	CURSOR_MARKER,
	Editor,
	Key,
	matchesKey,
	Text,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { type Static, Type } from "typebox";

const QuestionSchema = Type.Object({
	question: Type.String({ minLength: 1, description: "One focused question" }),
	options: Type.Array(
		Type.Object({
			label: Type.String({ minLength: 1 }),
			description: Type.Optional(Type.String()),
			recommended: Type.Optional(Type.Boolean({ description: "Mark at most one recommended choice" })),
		}),
		{ minItems: 2, maxItems: 4 },
	),
});
const Params = Type.Object({
	questions: Type.Array(QuestionSchema, {
		minItems: 1,
		description: "One question, or a prewritten chain shown one question at a time",
	}),
});
type Question = Static<typeof QuestionSchema>;
interface Answer {
	question: string;
	answer: string;
	wasCustom: boolean;
	index?: number;
}
interface Details {
	questions: Question[];
	answers: Answer[];
	cancelled: boolean;
}

function keyLabel(keys: KeybindingsManager, action: Parameters<KeybindingsManager["getKeys"]>[0]) {
	return keys.getKeys(action).join("/") || "unbound";
}

export default function question(pi: ExtensionAPI) {
	pi.registerTool({
		name: "question",
		label: "Question",
		description: "Ask the user one question or a prewritten chain, with choices and a custom answer.",
		promptSnippet: "Ask the user for a decision instead of guessing",
		promptGuidelines: [
			"Ask one focused question by default, with 2–4 choices and one marked recommended.",
			"Use a prewritten chain only when all questions can be written before seeing the answers.",
			"Do not add an Other option; the UI provides a custom-answer editor.",
			"Cancellation submits no answers and grants no permission. Never choose on the user's behalf.",
		],
		parameters: Params,
		exposure: "model-only",
		executionMode: "sequential",

		async execute(_id, params, signal, _onUpdate, ctx) {
			const questions = params.questions;
			const cancelled = () => ({
				content: [{ type: "text" as const, text: "User cancelled. No answers submitted; this is not approval." }],
				details: { questions, answers: [], cancelled: true } satisfies Details,
			});
			if (signal?.aborted) return cancelled();
			if (ctx.mode !== "tui") throw new Error("Question needs Pi's interactive terminal. Ask in chat instead.");
			if (!questions.length) throw new Error("Provide at least one question.");
			for (const q of questions) {
				const labels = q.options.map((o) => o.label.trim());
				if (!q.question.trim() || labels.length < 2 || labels.length > 4 || labels.some((label) => !label)) {
					throw new Error("Each question needs text and 2–4 nonempty choices.");
				}
				if (new Set(labels).size !== labels.length) throw new Error("Choice labels must be distinct.");
				if (q.options.filter((o) => o.recommended).length > 1) {
					throw new Error("Mark at most one recommended choice per question.");
				}
			}

			let onAbort: (() => void) | undefined;
			let completed = false;
			pi.events.emit("ai-workflow:attention", { id: `question:${_id}`, waiting: true });
			try {
				const answers = await ctx.ui.custom<Answer[] | null>((tui, theme, keys, done) => {
					const pages = questions.map(() => ({ selected: 0, draft: "", editing: false }));
					const saved: (Answer | undefined)[] = questions.map(() => undefined);
					let current = 0;
					let focused = false;
					let scroll = 0;
					let pageSize = 1;
					let followSelection = true;
					let lastWidth = 0;
					let lastRows = 0;
					const editor = new Editor(tui, {
						borderColor: (text) => theme.fg("accent", text),
						selectList: {
							selectedPrefix: (text) => theme.fg("accent", text),
							selectedText: (text) => theme.fg("accent", text),
							description: (text) => theme.fg("muted", text),
							scrollInfo: (text) => theme.fg("dim", text),
							noMatch: (text) => theme.fg("warning", text),
						},
					});
					function finish(value: Answer[] | null) {
						if (completed) return;
						completed = true;
						if (onAbort) signal?.removeEventListener("abort", onAbort);
						done(signal?.aborted ? null : value);
					}
					onAbort = () => finish(null);
					signal?.addEventListener("abort", onAbort, { once: true });
					if (signal?.aborted) finish(null);

					function refresh() {
						editor.focused = focused && pages[current].editing;
						tui.requestRender();
					}
					function goBack() {
						if (current === 0) return;
						pages[current].draft = editor.getText();
						current--;
						editor.setText(pages[current].draft);
						scroll = 0;
						followSelection = true;
						refresh();
					}
					function save(answer: Answer) {
						saved[current] = answer;
						pages[current].draft = editor.getText();
						if (current === questions.length - 1) {
							finish(saved.filter((item): item is Answer => item !== undefined));
							return;
						}
						current++;
						editor.setText(pages[current].draft);
						scroll = 0;
						followSelection = true;
						refresh();
					}
					editor.onSubmit = (text) => {
						if (completed || !text.trim()) return;
						save({ question: questions[current].question, answer: text.trim(), wasCustom: true });
					};

					return {
						get focused() {
							return focused;
						},
						set focused(value: boolean) {
							focused = value;
							refresh();
						},
						invalidate() {
							editor.invalidate();
						},
						dispose() {
							completed = true;
							if (onAbort) signal?.removeEventListener("abort", onAbort);
						},
						handleInput(data: string) {
							if (completed) return;
							const page = pages[current];
							const q = questions[current];
							if (matchesKey(data, Key.shift("tab"))) {
								goBack();
							} else if (keys.matches(data, "tui.select.cancel")) {
								if (page.editing) {
									page.draft = editor.getText();
									page.editing = false;
									followSelection = true;
								} else finish(null);
							} else if (page.editing) {
								editor.handleInput(data);
							} else if (keys.matches(data, "tui.select.up") || keys.matches(data, "tui.select.down")) {
								const direction = keys.matches(data, "tui.select.up") ? -1 : 1;
								page.selected = Math.max(
									0,
									Math.min(q.options.length + (current > 0 ? 1 : 0), page.selected + direction),
								);
								followSelection = true;
							} else if (
								keys.matches(data, "tui.select.pageUp") ||
								keys.matches(data, "tui.select.pageDown") ||
								matchesKey(data, Key.shift("pageUp")) ||
								matchesKey(data, Key.shift("pageDown"))
							) {
								scroll +=
									keys.matches(data, "tui.select.pageUp") || matchesKey(data, Key.shift("pageUp"))
										? -pageSize
										: pageSize;
								followSelection = false;
							} else if (keys.matches(data, "tui.select.confirm")) {
								if (page.selected < q.options.length) {
									save({
										question: q.question,
										answer: q.options[page.selected].label,
										wasCustom: false,
										index: page.selected + 1,
									});
								} else if (page.selected === q.options.length) {
									page.editing = true;
									editor.setText(page.draft);
								} else goBack();
							}
							refresh();
						},
						render(width: number) {
							const w = Math.max(1, width);
							if (lastWidth !== w || lastRows !== tui.terminal.rows) followSelection = true;
							lastWidth = w;
							lastRows = tui.terminal.rows;
							const page = pages[current];
							const q = questions[current];
							const body = [...wrapTextWithAnsi(theme.fg("text", q.question), w), ""];
							let selectedStart = body.length;
							let selectedEnd = selectedStart;
							const labels = [...q.options.map((o) => o.label), "Type something.", ...(current > 0 ? ["Back"] : [])];
							if (!page.editing) {
								for (let i = 0; i < labels.length; i++) {
									const start = body.length;
									const option = q.options[i];
									const label = `${i < q.options.length ? `${i + 1}. ` : ""}${labels[i]}${option?.recommended ? " (Recommended)" : ""}`;
									const prefix = i === page.selected ? "> " : "  ";
									const color = i === page.selected ? "accent" : "text";
									body.push(...wrapTextWithAnsi(theme.fg(color, prefix + label), w));
									if (option?.description)
										body.push(...wrapTextWithAnsi(theme.fg("muted", `    ${option.description}`), w));
									if (i === page.selected) {
										selectedStart = start;
										selectedEnd = body.length;
									}
								}
							} else {
								const lines = editor.render(w);
								selectedStart =
									body.length +
									Math.max(
										0,
										lines.findIndex((line) => line.includes(CURSOR_MARKER)),
									);
								selectedEnd = selectedStart + 1;
								body.push(...lines);
							}
							// Leave room for the transcript and Pi's footer, even on short terminals.
							const height = Math.max(3, Math.floor(tui.terminal.rows / 2));
							pageSize = Math.max(1, height - 2);
							if (followSelection || page.editing) {
								if (selectedStart < scroll) scroll = selectedStart;
								if (selectedEnd > scroll + pageSize) {
									scroll = selectedEnd - selectedStart > pageSize ? selectedStart : selectedEnd - pageSize;
								}
								followSelection = false;
							}
							scroll = Math.max(0, Math.min(scroll, body.length - pageSize));
							const title = `Question ${current + 1}/${questions.length}${scroll > 0 ? " ↑" : ""}${scroll + pageSize < body.length ? " ↓" : ""}${!page.editing && body.length > pageSize ? " · Shift+PgUp/PgDn read" : ""}`;
							const help = page.editing
								? `${keyLabel(keys, "tui.input.submit")} answer · ${keyLabel(keys, "tui.select.cancel")} back to choices`
								: `${keyLabel(keys, "tui.select.up")}/${keyLabel(keys, "tui.select.down")} choose · ${keyLabel(keys, "tui.select.confirm")} answer · ${keyLabel(keys, "tui.select.cancel")} cancel`;
							const footer = `${help}${current > 0 ? " · shift+tab previous" : ""}`;
							return [theme.fg("accent", title), ...body.slice(scroll, scroll + pageSize), theme.fg("dim", footer)].map(
								(line) => (visibleWidth(line) > w ? truncateToWidth(line, w) : line),
							);
						},
					};
				});
				if (signal?.aborted || !answers) return cancelled();
				return {
					content: [
						{
							type: "text",
							text: answers
								.map((a) => `${a.question}\nUser ${a.wasCustom ? "wrote" : "selected"}: ${a.answer}`)
								.join("\n\n"),
						},
					],
					details: { questions, answers, cancelled: false } satisfies Details,
				};
			} finally {
				pi.events.emit("ai-workflow:attention", { id: `question:${_id}`, waiting: false });
				completed = true;
				if (onAbort) signal?.removeEventListener("abort", onAbort);
			}
		},

		renderCall(args, theme) {
			const questions = args.questions ?? [];
			return new Text(
				theme.fg("toolTitle", theme.bold("question ")) +
					theme.fg("muted", questions.map((q: Question) => q.question).join("\n")),
				0,
				0,
			);
		},
		renderResult(result, _options, theme, context) {
			const details = result.details as Details | undefined;
			if (context.isError || !details) {
				return new Text(
					result.content
						.filter((part) => part.type === "text")
						.map((part) => part.text)
						.join("\n"),
					0,
					0,
				);
			}
			return new Text(
				details.cancelled
					? theme.fg("warning", "Cancelled; no answers submitted")
					: details.answers.map((a) => theme.fg("success", "✓ ") + theme.fg("accent", a.answer)).join("\n"),
				0,
				0,
			);
		},
	});
}
