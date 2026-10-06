import { basename } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const PROVIDERS = new Set(["openai-codex"]);
const tokens = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function clean(text: string) {
	return stripTerminalSequences(text)
		.replace(/\p{Cc}/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function duration(ms: number) {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	return `${hours ? `${hours}h` : ""}${minutes ? `${minutes % 60}m` : ""}${seconds % 60}s`;
}

export default function footer(pi: ExtensionAPI) {
	let active = false;
	let started: number | undefined;
	let elapsed: number | undefined;
	let redraw: (() => void) | undefined;
	let ticker: ReturnType<typeof setInterval> | undefined;
	const stopTicker = () => {
		clearInterval(ticker);
		ticker = undefined;
	};
	const startTicker = () => {
		stopTicker();
		if (started !== undefined && redraw) {
			ticker = setInterval(() => redraw?.(), 1000);
			ticker.unref();
		}
	};
	const resetClock = () => {
		stopTicker();
		started = undefined;
		elapsed = undefined;
	};
	const update = (ctx: ExtensionContext, model = ctx.model) => {
		if (ctx.mode !== "tui") return;
		if (!model || !PROVIDERS.has(model.provider)) {
			if (active) ctx.ui.setFooter(undefined);
			active = false;
			return;
		}
		ctx.ui.setFooter((tui, theme, data) => {
			const requestRender = () => tui.requestRender();
			redraw = requestRender;
			startTicker();
			const unsubscribe = data.onBranchChange(requestRender);
			return {
				dispose() {
					unsubscribe();
					if (redraw === requestRender) {
						redraw = undefined;
						stopTicker();
					}
				},
				invalidate() {},
				render(width) {
					if (width < 1) return [];
					const usage = ctx.getContextUsage();
					const percent = usage?.percent;
					const capacity = usage?.contextWindow ?? model.contextWindow;
					const context = theme.fg(
						percent != null && percent > 90 ? "error" : percent != null && percent > 70 ? "warning" : "dim",
						`context ${percent == null ? "?" : `${percent.toFixed(1)}%`}/${tokens.format(capacity).toLowerCase()}`,
					);
					const branch = data.getGitBranch();
					const project = clean(`${basename(ctx.cwd) || ctx.cwd}${branch ? ` (${branch})` : ""}`);
					const statuses = data.getExtensionStatuses();
					const right = theme.fg(
						"dim",
						[
							clean(model.id),
							model.reasoning ? (ctx.thinkingLevel ?? pi.getThinkingLevel()) : "",
							model.provider === "openai-codex" && statuses.get("ai-workflow-fast") === "Fast: on" ? "fast" : "",
						]
							.filter(Boolean)
							.join(" · "),
					);
					const ms = started === undefined ? elapsed : performance.now() - started;
					const clock = ms === undefined ? "" : theme.fg(started === undefined ? "dim" : "accent", `⏱ ${duration(ms)}`);
					const details = clock ? `${context}${theme.fg("dim", " · ")}${clock}` : context;
					const left = `${theme.fg("dim", `${project} · `)}${details}`;
					const padding = width - visibleWidth(left) - visibleWidth(right);
					let lines: string[];
					if (padding >= 2) {
						lines = [left + " ".repeat(padding) + right];
					} else {
						const stats = visibleWidth(details) <= width ? details : context;
						const available = width - visibleWidth(stats) - 3;
						const name = available > 0 ? truncateToWidth(theme.fg("dim", project), available, "…") : "";
						const modelLine = stats !== details && clock ? `${clock}${theme.fg("dim", " · ")}${right}` : right;
						lines = [truncateToWidth(name ? `${name} · ${stats}` : stats, width), truncateToWidth(modelLine, width)];
					}
					const other = [...statuses]
						.filter(([key]) => key !== "ai-workflow-fast")
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([, text]) => clean(text))
						.filter(Boolean)
						.join(" · ");
					if (other) lines.push(truncateToWidth(theme.fg("dim", other), width));
					return lines;
				},
			};
		});
		active = true;
	};
	pi.on("agent_start", (_event, ctx) => {
		if (ctx.mode !== "tui" || started !== undefined) return;
		started = performance.now();
		elapsed = undefined;
		startTicker();
		redraw?.();
	});
	pi.on("agent_settled", () => {
		if (started !== undefined) elapsed = performance.now() - started;
		started = undefined;
		stopTicker();
		redraw?.();
	});
	pi.on("session_start", (_event, ctx) => {
		resetClock();
		update(ctx);
	});
	pi.on("session_tree", (_event, ctx) => {
		resetClock();
		update(ctx);
	});
	pi.on("model_select", (event, ctx) => update(ctx, event.model));
	pi.on("session_shutdown", (_event, ctx) => {
		resetClock();
		if (active && ctx.mode === "tui") ctx.ui.setFooter(undefined);
		active = false;
	});
}
