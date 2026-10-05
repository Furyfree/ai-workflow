// Run only through test.sh: Pi supplies its own module loader, no test dependencies.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import gate from "./pi/permission-gate.ts";
import question from "./pi/question.ts";
import notify from "./pi/notify.ts";
import bookmark from "./pi/bookmark.ts";
import handoff from "./pi/handoff.ts";
import issues from "./pi/github-issue-autocomplete.ts";
import subagent from "./pi/subagent/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
function register(extension: (pi: ExtensionAPI) => void, extra = {}) {
	const events = new Map<string, any>(), tools = new Map<string, any>(), commands = new Map<string, any>();
	const api = {
		on: (name: string, handler: any) => events.set(name, handler),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		registerCommand: (name: string, command: any) => commands.set(name, command),
		...extra,
	};
	extension(api as unknown as ExtensionAPI);
	return { events, tools, commands };
}
const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
function customUI(keys: string[] = []) {
	return (factory: any) => new Promise((done) => {
		let component: any;
		let finished = false;
		component = factory({ requestRender() {} }, theme, {}, (answer: any) => {
			finished = true;
			component?.dispose?.();
			done(answer);
		});
		if (finished) component?.dispose?.();
		for (const key of keys) component.handleInput(key);
	});
}

async function run(pi: ExtensionAPI) {
	const root = process.env.AI_WORKFLOW_TEST_ROOT;
	assert.ok(root, "Use test.sh, not a live Pi session");
	assert.equal(resolve(getAgentDir()), join(root, ".pi", "agent"), "Refusing to touch a live agent directory");
	const loadedTools = pi.getAllTools().map((tool) => tool.name);
	assert.ok(loadedTools.includes("question") && loadedTools.includes("subagent"), "Installed extensions must load");
	const signal = new AbortController().signal;
	const base = { cwd: process.cwd(), mode: "rpc", hasUI: false, isProjectTrusted: () => false };

	// Ordinary work stays prompt-free; guarded commands reject, cancel, or require approval.
	let prompts = 0, answer: string | undefined = "No";
	const guard = register(gate).events.get("tool_call");
	const ui = { ...base, hasUI: true, ui: { select: async () => { prompts++; return answer; } } };
	for (const command of ["git status", "git log --grep=push", "git reset --soft HEAD~1", "rm one-file", "npm test"]) {
		assert.equal(await guard({ toolName: "bash", input: { command } }, ui), undefined);
	}
	assert.equal(await guard({ toolName: "edit", input: {} }, ui), undefined);
	assert.equal(prompts, 0);
	for (const command of ["rm -rf folder", "rm -fr folder", "rm -f -r folder", "rm --recursive folder", "git push", "git -C 'some repo' push", "git --no-pager reset --hard HEAD"]) {
		const event = { toolName: "bash", input: { command } };
		assert.equal((await guard(event, base)).block, true);
		assert.equal((await guard(event, ui)).block, true);
		answer = undefined;
		assert.equal((await guard(event, ui)).block, true);
		answer = "Yes";
		assert.equal(await guard(event, ui), undefined);
		answer = "No";
	}
	const beforeSudo = prompts;
	assert.equal((await guard({ toolName: "bash", input: { command: "sudo anything" } }, ui)).block, true);
	assert.equal(prompts, beforeSudo);

	// The official question component supports selection, free text, and Escape.
	const ask = register(question).tools.get("question");
	const params = { question: "Which?", options: [{ label: "First" }, { label: "Second" }] };
	const ctx = { ...base, mode: "tui", hasUI: true, ui: { custom: customUI(["\x1b[B", "\r"]) } };
	assert.equal((await ask.execute("test", params, signal, undefined, ctx)).details.answer, "Second");
	ctx.ui.custom = customUI(["\x1b"]);
	assert.equal((await ask.execute("test", params, signal, undefined, ctx)).details.answer, null);
	ctx.ui.custom = customUI(["\x1b[B", "\x1b[B", "\r", "My choice", "\r"]);
	assert.equal((await ask.execute("test", params, signal, undefined, ctx)).details.answer, "My choice");
	assert.equal((await ask.execute("test", params, signal, undefined, base)).details.answer, null);

	// Notifications must not corrupt JSON/RPC output.
	const settled = register(notify).events.get("agent_settled");
	let written = "";
	const stdout = process.stdout.write;
	process.stdout.write = ((text: any) => { written += text; return true; }) as typeof stdout;
	try { await settled({}, base); } finally { process.stdout.write = stdout; }
	assert.equal(written, "");

	const labels: Array<[string, string | undefined]> = [];
	const marks = register(bookmark, { setLabel: (id: string, label: string | undefined) => labels.push([id, label]) });
	const entries = [{ id: "a", type: "message", message: { role: "assistant" } }, { id: "b", type: "message", message: { role: "user" } }];
	const markCtx = { sessionManager: {
		getEntries: () => [...entries, { id: "abandoned", type: "message", message: { role: "assistant" } }],
		getBranch: () => entries, getLabel: (id: string) => id === "a" ? "decision" : undefined,
	}, ui: { notify() {} } };
	await marks.commands.get("bookmark").handler("decision", markCtx);
	assert.deepEqual(labels[0], ["a", "decision"]);
	await marks.commands.get("unbookmark").handler("", markCtx);
	assert.deepEqual(labels[1], ["a", undefined]);

	// Handoff reviews a draft and fills the replacement editor without submitting it.
	let newSessions = 0, draft = "", edited: string | undefined = "Reviewed continuation";
	const transfer = register(handoff).commands.get("handoff");
	const transferCtx = {
		...base, mode: "tui", model: {},
		sessionManager: {
			getBranch: () => [{ type: "message", id: "a", message: { role: "user", content: "Investigate this" } }],
			getSessionFile: () => "parent.jsonl",
		},
		modelRegistry: { complete: async () => ({ stopReason: "stop", content: [{ type: "text", text: "Generated continuation" }] }) },
		ui: { custom: customUI(), editor: async () => edited, notify() {} },
		newSession: async (options: any) => {
			newSessions++;
			assert.equal(options.parentSession, "parent.jsonl");
			await options.withSession({ ui: { setEditorText: (text: string) => { draft = text; }, notify() {} } });
			return { cancelled: false };
		},
	};
	await transfer.handler("Next task", transferCtx);
	assert.equal(draft, edited);
	assert.equal(newSessions, 1);
	edited = undefined;
	await transfer.handler("Next task", transferCtx);
	assert.equal(newSessions, 1);

	// Issue completion uses the repository remote and inserts a number, not a body.
	let provider: any;
	const completion = register(issues, { exec: async (cmd: string, args: string[]) => {
		if (cmd === "git") return { code: 0, stdout: "origin\tgit@github.com:example/project.git (fetch)\n" };
		assert.equal(args[args.indexOf("--repo") + 1], "example/project");
		return { code: 0, stdout: JSON.stringify([{ number: 123, title: "Fix parser", state: "OPEN" }]) };
	} });
	await completion.events.get("session_start")({}, { ...base, mode: "tui", ui: {
		addAutocompleteProvider: (wrap: any) => { provider = wrap({ getSuggestions: async () => null }); }, notify() {},
	} });
	const suggestions = await provider.getSuggestions(["Read #12"], 0, 8, { signal });
	assert.equal(suggestions.items[0].value, "#123");
	assert.match(suggestions.items[0].description, /Fix parser/);
	assert.equal(await provider.getSuggestions(["ordinary text"], 0, 13, { signal }), null);

	// Exercise actual Pi children against a local fixture endpoint, never a paid provider.
	mkdirSync(join(getAgentDir(), "agents"), { recursive: true });
	for (const role of ["scout", "planner", "reviewer", "worker"]) {
		const source = join(here, "pi/subagent/agents", `${role}.md`);
		assert.doesNotMatch(readFileSync(source, "utf8"), /^model:/m, "Roles must not pin model IDs");
		assert.equal(readFileSync(join(getAgentDir(), "agents", `${role}.md`), "utf8"), readFileSync(source, "utf8"));
	}
	let started: (() => void) | undefined;
	const requests: any[] = [];
	const server = createServer(async (req, res) => {
		let body = "";
		for await (const chunk of req) body += chunk;
		const request = JSON.parse(body);
		requests.push(request);
		const task = JSON.stringify(request.messages);
		if (task.includes("API_FAILURE")) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: "Fixture provider rejected the request" } }));
			return;
		}
		res.writeHead(200, { "Content-Type": "text/event-stream" });
		if (task.includes("HANG")) { res.write(": waiting\n\n"); started?.(); return; }
		const called = request.messages.some((message: any) => message.role === "tool");
		let delta: any = { role: "assistant", content: "Fixture complete" }, finish = "stop";
		if (!called && (task.includes("WRITE_FILE") || task.includes("REMOVE_FOLDER"))) {
			const tool = task.includes("WRITE_FILE") ? "write" : "bash";
			const args = tool === "write" ? { path: join(root, "result.txt"), content: "written" } : { command: `rm -rf '${join(root, "preserve")}'` };
			delta = { role: "assistant", tool_calls: [{ index: 0, id: "call_fixture", type: "function", function: { name: tool, arguments: JSON.stringify(args) } }] };
			finish = "tool_calls";
		}
		const chunk = { id: "fixture", object: "chat.completion.chunk", created: 1, model: "fixture-model", choices: [{ index: 0, delta, finish_reason: null }] };
		res.write(`data: ${JSON.stringify(chunk)}\n\n`);
		res.write(`data: ${JSON.stringify({ ...chunk, choices: [{ index: 0, delta: {}, finish_reason: finish }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
		res.end("data: [DONE]\n\n");
	});
	await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
	try {
		const address = server.address() as { port: number };
		writeFileSync(join(getAgentDir(), "models.json"), JSON.stringify({ providers: { fixture: {
			baseUrl: `http://127.0.0.1:${address.port}/v1`, api: "openai-completions", apiKey: "test-only",
			models: [{ id: "fixture-model", contextWindow: 10000, maxTokens: 1000 }],
		} } }));
		const delegate = register(subagent).tools.get("subagent");
		const childCtx = { ...base, model: { provider: "fixture", id: "fixture-model" }, thinkingLevel: "low" };
		const execute = (params: any, childSignal = signal) => delegate.execute("test", params, childSignal, undefined, childCtx);
		const unknown = await execute({ agent: "missing", task: "READ" });
		assert.equal(unknown.isError, true);
		mkdirSync(join(process.cwd(), ".pi/agents"), { recursive: true });
		writeFileSync(join(process.cwd(), ".pi/agents/project.md"), "---\nname: project\ndescription: Fixture role\ntools: read\n---\nRead only.\n");
		await assert.rejects(execute({ agent: "project", task: "READ", agentScope: "project", confirmProjectAgents: false }), /interactive approval/);
		const chain = await execute({ chain: [{ agent: "scout", task: "READ" }, { agent: "planner", task: "READ {previous}" }] });
		assert.equal(chain.details.results.length, 2);
		assert.notEqual(chain.isError, true);
		const parallel = await execute({ tasks: [{ agent: "scout", task: "READ" }, { agent: "reviewer", task: "READ" }] });
		assert.equal(parallel.details.results.length, 2);
		assert.equal(parallel.isError, false);
		const mixed = await execute({ tasks: [{ agent: "scout", task: "READ" }, { agent: "missing", task: "READ" }] });
		assert.equal(mixed.isError, true);
		await assert.rejects(execute({ chain: [{ agent: "planner", task: "READ" }, { agent: "worker", task: "WRITE_FILE" }] }), /separately/);
		const read = await execute({ agent: "scout", task: "WRITE_FILE" });
		assert.equal(read.details.results[0].model, "fixture/fixture-model");
		assert.equal(existsSync(join(root, "result.txt")), false, "Read-only scout must not write");
		const write = await execute({ agent: "worker", task: "Approved scope: write the fixture file. WRITE_FILE" });
		assert.notEqual(write.isError, true);
		assert.equal(readFileSync(join(root, "result.txt"), "utf8"), "written");
		mkdirSync(join(root, "preserve"));
		await execute({ agent: "worker", task: "REMOVE_FOLDER" });
		assert.equal(existsSync(join(root, "preserve")), true, "Child must load the permission gate");
		assert.ok(requests.some((r) => JSON.stringify(r.messages).includes("interactive approval")));

		const failed = await execute({ agent: "scout", task: "API_FAILURE" });
		assert.equal(failed.isError, true, "Provider failures must not become successful reviews");
		assert.match(failed.content[0].text, /Fixture provider rejected/);
		assert.ok(requests.every((request) => request.model === "fixture-model"), "Children must inherit the selected model");
		const abort = new AbortController();
		const running = new Promise<void>((done) => { started = done; });
		const child = execute({ agent: "scout", task: "HANG" }, abort.signal);
		await running;
		abort.abort();
		await assert.rejects(child, /aborted/);

		// Advance only the production ten-minute timer, not provider or cleanup timers.
		const timer = globalThis.setTimeout;
		globalThis.setTimeout = ((fn: any, delay: number, ...args: any[]) => timer(fn, delay === 600000 ? 1500 : delay, ...args)) as typeof timer;
		try {
			const timeout = await execute({ agent: "scout", task: "HANG" });
			assert.equal(timeout.isError, true);
			assert.equal(timeout.details.results[0].exitCode, 124);
		} finally { globalThis.setTimeout = timer; }
		assert.equal(readdirSync(tmpdir()).some((name) => name.startsWith("pi-subagent-")), false, "Temporary prompts must be removed");
	} finally {
		server.closeAllConnections();
		await new Promise<void>((done) => server.close(() => done()));
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		try {
			await run(pi);
			process.stdout.write("Pi extension checks passed\n");
		} catch (error) {
			console.error(error);
			process.exitCode = 1;
		} finally { ctx.shutdown(); }
	});
}
