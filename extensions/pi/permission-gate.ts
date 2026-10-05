// Adapted from Pi v1.0.2 examples/extensions/permission-gate.ts; see ../LICENSE.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ponytail: patterns catch common commands, not arbitrary shell programs.
// Use OS isolation for hard limits; ordinary tools do not require approval.
const git = String.raw`\bgit(?:\s+(?:-C|-c|--git-dir|--work-tree)\s+(?:"[^"]*"|'[^']*'|[^\s;&|]+)|\s+--[^\s;&|]+)*\s+`;
const guarded = [
	/\brm\b[^;&|\n]*(?:\s-[a-zA-Z]*[rR][a-zA-Z]*\b|\s--recursive\b)/,
	new RegExp(`${git}push\\b`),
	new RegExp(`${git}reset\\b[^;&|\\n]*\\s--hard\\b`),
];

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return;
		const command = event.input.command as string;
		if (/\bsudo\b/.test(command)) {
			return { block: true, reason: "sudo is forbidden; request an explicitly approved pkexec command instead." };
		}
		if (!guarded.some((pattern) => pattern.test(command))) return;
		if (!ctx.hasUI) {
			return { block: true, reason: "This command needs interactive approval. Ask the parent or user to run it." };
		}
		const choice = await ctx.ui.select(`Allow command?\n\n${command}`, ["Yes", "No"]);
		if (choice !== "Yes") return { block: true, reason: "Command was not approved." };
	});
}
