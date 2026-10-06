// Adapted from SI-RUI-ZHANG/pi-codex-fast-mode at e2ef957395097476a97cc54cdcb680e19efa5598.
// MIT notice: extensions/THIRD_PARTY_NOTICES in ai-workflow.

import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type ExtensionAPI, type ExtensionContext, getAgentDir } from "@earendil-works/pi-coding-agent";

export default function fast(pi: ExtensionAPI) {
	const statePath = join(getAgentDir(), "state", "ai-workflow-fast.json");
	let enabled = false;
	let warnedAboutConflict = false;
	let warnedAboutPayload = false;

	function updateStatus(ctx: ExtensionContext, model = ctx.model) {
		if (ctx.mode !== "tui") return;
		const label = model?.provider === "openai-codex" ? `Fast: ${enabled ? "on" : "off"}` : undefined;
		ctx.ui.setStatus("ai-workflow-fast", label);
	}

	function statusMessage(ctx: ExtensionContext) {
		if (!enabled) return "Fast mode is off.";
		if (ctx.model?.provider !== "openai-codex") {
			return "Fast preference is on, but inactive on this provider.";
		}
		return "Fast mode is on: requesting priority processing; OpenAI may reject or downgrade it.";
	}

	pi.on("session_start", (_event, ctx) => {
		enabled = false;
		warnedAboutConflict = false;
		warnedAboutPayload = false;
		try {
			const state = JSON.parse(readFileSync(statePath, "utf8"));
			if (state?.version !== 1 || typeof state.enabled !== "boolean") {
				throw new Error("Invalid saved preference");
			}
			enabled = state.enabled;
		} catch (error) {
			if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
				ctx.ui.notify("Could not read the saved Fast preference; defaulting to off.", "warning");
			}
		}
		updateStatus(ctx);
	});

	pi.on("model_select", (event, ctx) => updateStatus(ctx, event.model));

	pi.registerCommand("fast", {
		description: "Toggle saved Codex Fast mode, or use on, off, status",
		getArgumentCompletions: (prefix) =>
			["on", "off", "status"]
				.filter((value) => value.startsWith(prefix.trim().toLowerCase()))
				.map((value) => ({ value, label: value })),
		handler: async (args, ctx) => {
			const command = args.trim().toLowerCase();
			if (!["", "on", "off", "status"].includes(command)) {
				ctx.ui.notify("Usage: /fast [on | off | status]", "error");
				return;
			}
			if (command === "status") {
				ctx.ui.notify(statusMessage(ctx), "info");
				return;
			}

			enabled = command === "" ? !enabled : command === "on";
			updateStatus(ctx);
			if (enabled) {
				ctx.ui.notify(
					"Fast requests priority processing for Codex. It can consume extra usage; speed is not guaranteed.",
					"warning",
				);
			}
			try {
				const directory = dirname(statePath);
				mkdirSync(directory, { recursive: true, mode: 0o700 });
				const temporaryDirectory = mkdtempSync(join(directory, ".fast-"));
				try {
					const temporaryPath = join(temporaryDirectory, "state.json");
					writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, enabled })}\n`, { mode: 0o600 });
					renameSync(temporaryPath, statePath);
				} finally {
					rmSync(temporaryDirectory, { recursive: true, force: true });
				}
			} catch {
				ctx.ui.notify(
					`Fast mode is ${enabled ? "on" : "off"} for this process, but could not save the preference.`,
					"warning",
				);
				return;
			}
			ctx.ui.notify(statusMessage(ctx), "info");
		},
	});

	pi.on("before_provider_request", (event, ctx) => {
		if (!enabled || ctx.model?.provider !== "openai-codex") return;
		if (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload)) {
			if (!warnedAboutPayload) {
				warnedAboutPayload = true;
				ctx.ui.notify("Fast could not modify this provider payload; leaving the request unchanged.", "warning");
			}
			return;
		}
		const payload = event.payload as Record<string, unknown>;
		if (payload.service_tier !== undefined && payload.service_tier !== "priority" && !warnedAboutConflict) {
			warnedAboutConflict = true;
			ctx.ui.notify("Fast replaced another service tier. Use only one service-tier extension.", "warning");
		}
		return { ...payload, service_tier: "priority" };
	});
}
