import { basename } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// Input prompts emit this only while waiting for an answer, not for loaders or dashboards.
const ATTENTION = "ai-workflow:attention";
const DELAY = 150;

function clean(text: string) {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: OSC fields must not contain controls or separators.
	return text.replace(/[\x00-\x1f\x7f-\x9f;]/g, " ").slice(0, 120);
}

function notification(title: string, body: string): string | undefined {
	const program = process.env.TERM_PROGRAM;
	if (program === "ghostty" || program === "WezTerm" || process.env.TERM?.includes("ghostty")) {
		return `\x1b]777;notify;${clean(title)};${clean(body)}\x07`;
	}
	if (process.env.KITTY_WINDOW_ID) {
		return `\x1b]99;i=pi:d=0;${clean(title)}\x1b\\\x1b]99;i=pi:p=body;${clean(body)}\x1b\\`;
	}
	if (program === "iTerm.app") return `\x1b]9;${clean(title)}: ${clean(body)}\x07`;
	return undefined;
}

export default function notify(pi: ExtensionAPI) {
	let context: ExtensionContext | undefined;
	let enabled = true;
	let focused: boolean | undefined;
	let terminal = false;
	let ready = false;
	let sentAttention = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let unsubscribe: (() => void) | undefined;
	const waiting = new Set<string>();
	const cancel = () => {
		clearTimeout(timer);
		timer = undefined;
		ready = false;
	};
	const send = (body: string, force = false) => {
		if (!context || !terminal || (!force && (!enabled || focused === true))) return false;
		const sequence = notification("Pi", `${clean(basename(context.cwd))}: ${body}`);
		if (!sequence) return false;
		process.stdout.write(sequence);
		return true;
	};
	const schedule = () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			if (!context) return;
			if (waiting.size) {
				if (!sentAttention) sentAttention = send("Answer needed");
			} else if (ready) {
				ready = false;
				// A settled handler can queue a subagent result and start another parent turn.
				if (context.isIdle() && !context.hasPendingMessages()) send("Ready for input");
			}
		}, DELAY);
		timer.unref();
	};
	const stop = () => {
		cancel();
		unsubscribe?.();
		unsubscribe = undefined;
		waiting.clear();
		sentAttention = false;
		if (terminal) process.stdout.write("\x1b[?1004l");
		terminal = false;
		context = undefined;
	};
	pi.on("session_start", (_event, ctx) => {
		stop();
		context = ctx;
		focused = undefined;
		terminal = ctx.mode === "tui" && process.stdout.isTTY === true && process.env.AI_WORKFLOW_SUBAGENT !== "1";
		if (!terminal) return;
		if (!notification("Pi", "test")) {
			terminal = false;
			ctx.ui.notify("Notify: unsupported terminal. Use Ghostty, WezTerm, Kitty, or iTerm2.", "warning");
			return;
		}
		process.stdout.write("\x1b[?1004h");
		unsubscribe = ctx.ui.onTerminalInput((data) => {
			if (data !== "\x1b[I" && data !== "\x1b[O") return;
			focused = data === "\x1b[I";
			if (!focused && waiting.size) schedule();
			return { consume: true };
		});
	});
	pi.on("session_shutdown", stop);
	pi.on("before_agent_start", () => {
		cancel();
	});
	pi.on("input", () => {
		cancel();
	});
	pi.on("agent_settled", (_event, ctx) => {
		context = ctx;
		ready = true;
		schedule();
	});
	pi.events.on(ATTENTION, (data) => {
		if (!data || typeof data !== "object" || !("id" in data) || !("waiting" in data)) return;
		if (typeof data.id !== "string" || typeof data.waiting !== "boolean") return;
		if (data.waiting) {
			waiting.add(data.id);
			ready = false;
			schedule();
		} else {
			waiting.delete(data.id);
			if (!waiting.size) {
				sentAttention = false;
				cancel();
			}
		}
	});
	pi.registerCommand("notify", {
		description: "Turn desktop notifications on/off, or send a test",
		handler: async (args, ctx) => {
			if (args.trim() === "test") {
				if (!send("Notification test", true)) ctx.ui.notify("Notify needs a supported interactive terminal.", "error");
				return;
			}
			if (!["", "on", "off"].includes(args.trim())) {
				ctx.ui.notify("Usage: /notify [on|off|test]", "error");
				return;
			}
			enabled = args.trim() ? args.trim() === "on" : !enabled;
			if (!enabled) cancel();
			else if (waiting.size) schedule();
			ctx.ui.notify(`Notify: ${enabled ? "on" : "off"} (this runtime)`, "info");
		},
	});
}
