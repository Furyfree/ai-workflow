import assert from "node:assert/strict";
import { test } from "node:test";
import type {
	AgentToolResult,
	ExecOptions,
	ExecResult,
	ExtensionAPI,
	ExtensionContext,
	ExtensionToolContext,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Check } from "typebox/value";
import web from "../extensions/web.ts";

type Complete = ExtensionContext["modelRegistry"]["complete"];
type Message = Awaited<ReturnType<Complete>>;
type Options = NonNullable<Parameters<Complete>[2]>;
type Request = { model: Parameters<Complete>[0]; context: Parameters<Complete>[1]; options: Options; payload: unknown };
type Output = { model?: string; results: Array<Record<string, unknown>> };

function message(input = 10): Message {
	return {
		role: "assistant",
		content: [{ type: "text", text: "Official documentation explains the search API." }],
		stopReason: "stop",
		usage: {
			input,
			output: 2,
			cacheRead: 3,
			cacheWrite: 0,
			reasoning: 1,
			totalTokens: input + 5,
			cost: { input: input / 1000, output: 0.002, cacheRead: 0.003, cacheWrite: 0, total: (input + 5) / 1000 },
		},
	} as Message;
}

async function searched(request: Request, urls = ["https://docs.example.org/api"]): Promise<void> {
	await request.options.onProviderStreamEvent?.(
		{
			type: "response.output_item.done",
			item: {
				type: "web_search_call",
				status: "completed",
				action: { sources: urls.map((url) => ({ type: "url", url })) },
			},
		},
		request.model,
	);
	await request.options.onProviderStreamEvent?.(
		{
			type: "response.completed",
			response: {
				output: [
					{
						type: "message",
						content: [{ annotations: [{ type: "url_citation", url: urls[0], title: "API documentation" }] }],
					},
				],
			},
		},
		request.model,
	);
}

function harness() {
	const tools = new Map<string, ToolDefinition>();
	const requests: Request[] = [];
	const executions: Array<{ command: string; args: string[]; options?: ExecOptions }> = [];
	let oauth = true;
	let complete = async (request: Request): Promise<Message> => {
		await searched(request);
		return message();
	};
	let exec = async (): Promise<ExecResult> => ({
		code: 0,
		killed: false,
		stderr: "",
		stdout: JSON.stringify({
			url: "https://site.example.org/final",
			http_status: 200,
			error: null,
			content: "first\nsecond\nthird\nfourth",
		}),
	});
	const ctx = {
		cwd: "/tmp",
		model: {
			provider: "openai-codex",
			api: "openai-codex-responses",
			id: "chosen-codex-model",
			baseUrl: "https://chatgpt.com/backend-api",
		},
		modelRegistry: {
			isUsingOAuth: () => oauth,
			complete: async (model: Request["model"], context: Request["context"], options: Options) => {
				const request: Request = { model, context, options, payload: undefined };
				requests.push(request);
				request.payload = await options.onPayload?.(
					{ model: model.id, stream: true, tools: [{ type: "function", name: "unrelated" }], input: context.messages },
					model,
				);
				return complete(request);
			},
		},
		// A real session may contain secrets; web_search must never include it in its nested request.
		sessionManager: { getBranch: () => [{ secret: "private-session-marker" }] },
	} as unknown as ExtensionToolContext;
	web({
		registerTool: (definition: ToolDefinition) => tools.set(definition.name, definition),
		exec: async (command: string, args: string[], options?: ExecOptions) => {
			executions.push({ command, args, options });
			return exec();
		},
	} as unknown as ExtensionAPI);
	return {
		ctx,
		tools,
		requests,
		executions,
		setOAuth: (value: boolean) => {
			oauth = value;
		},
		complete: (value: typeof complete) => {
			complete = value;
		},
		exec: (value: typeof exec) => {
			exec = value;
		},
		async run(name: string, params: Record<string, unknown>, signal?: AbortSignal) {
			const tool = tools.get(name);
			assert.ok(tool);
			assert.equal(Check(tool.parameters, params), true, "Test arguments satisfy the public tool schema");
			const result = await tool.execute("web-test", params, signal, undefined, ctx);
			assert.ok(tool.outputSchema);
			assert.equal(Check(tool.outputSchema, result.structuredContent), true, "Structured output satisfies its schema");
			assert.deepEqual(result.structuredContent, result.details);
			return result;
		},
	};
}

function output(result: AgentToolResult<unknown>): Output {
	return result.structuredContent as unknown as Output;
}
function text(result: AgentToolResult<unknown>): string {
	return result.content
		.filter((block) => block.type === "text")
		.map((block) => block.text)
		.join("\n");
}
function page(content: string, extra = {}) {
	return {
		code: 0,
		killed: false,
		stderr: "",
		stdout: JSON.stringify({ http_status: 200, error: null, content, ...extra }),
	};
}

// Protects model selection, conversation privacy, and actual hosted-search evidence at the caller interface.
test("search follows the selected Codex model and sends only the query to hosted search", async () => {
	const app = harness();
	for (const id of ["chosen-codex-model", "future-codex-model"]) {
		assert.ok(app.ctx.model);
		app.ctx.model.id = id;
		const result = await app.run("web_search", { queries: ["search API documentation"] });
		assert.equal(result.isError, false);
		assert.equal(output(result).model, id);
		assert.deepEqual(output(result).results[0].sources, [
			{ title: "API documentation", url: "https://docs.example.org/api" },
		]);
		assert.match(text(result), /Codex-generated summary/);
		const request = app.requests.at(-1);
		assert.ok(request);
		assert.equal(request.model.id, id);
		assert.deepEqual(
			request.context.messages.map((m) => m.role),
			["user"],
		);
		assert.equal(request.context.messages[0].content, "search API documentation");
		assert.doesNotMatch(JSON.stringify(request.context), /private-session-marker/);
		assert.equal(request.options.maxRetries, 0);
		assert.equal(request.options.transport, "sse");
		assert.ok(request.options.signal);
		assert.deepEqual((request.payload as Record<string, unknown>).tools, [
			{ type: "web_search", external_web_access: true, search_context_size: "low" },
		]);
		assert.equal((request.payload as Record<string, unknown>).tool_choice, "required");
		assert.deepEqual(result.usage, message().usage);
	}
});

test("batch search deduplicates trimmed queries, bounds sources, and adds all nested usage", async () => {
	const app = harness();
	app.complete(async (request) => {
		await searched(request, ["https://one.example.org/", "https://two.example.org/", "https://three.example.org/"]);
		return message(app.requests.length * 10);
	});
	const result = await app.run("web_search", { queries: [" first ", "first", "second"], limit: 2 });
	assert.deepEqual(
		app.requests.map((r) => r.context.messages[0].content),
		["first", "second"],
	);
	assert.equal(output(result).results.length, 2);
	assert.equal((output(result).results[0].sources as unknown[]).length, 2);
	assert.equal(result.usage?.input, 30);
	assert.equal(result.usage?.totalTokens, 40);
	assert.equal(result.usage?.reasoning, 2);
	assert.equal(result.usage?.cost.total, 0.04);
});

test("invalid model, endpoint, login, or blank query fails before a search request", async () => {
	for (const change of [
		(app: ReturnType<typeof harness>) => {
			app.ctx.model = undefined;
		},
		(app: ReturnType<typeof harness>) => {
			assert.ok(app.ctx.model);
			app.ctx.model.provider = "other-provider";
		},
		(app: ReturnType<typeof harness>) => {
			assert.ok(app.ctx.model);
			app.ctx.model.baseUrl = "https://gateway.example.org";
		},
		(app: ReturnType<typeof harness>) => app.setOAuth(false),
	]) {
		const app = harness();
		change(app);
		await assert.rejects(app.run("web_search", { queries: ["public query"] }));
		assert.equal(app.requests.length, 0);
	}
	const app = harness();
	await assert.rejects(app.run("web_search", { queries: ["valid", "   "] }), /blank/);
	assert.equal(app.requests.length, 0);
});

test("a generated answer without completed hosted search is not accepted", async () => {
	const app = harness();
	app.complete(async () => message());
	const result = await app.run("web_search", { queries: ["public query"] });
	assert.equal(result.isError, true);
	assert.match(text(result), /did not perform a web search/);
	assert.doesNotMatch(text(result), /Official documentation explains/);
	assert.deepEqual(result.usage, message().usage);
});

test("unsafe provider links and terminal controls do not enter search results", async () => {
	const app = harness();
	app.complete(async (request) => {
		await searched(request, [
			"javascript:alert(1)",
			"file:///etc/passwd",
			"https://user:private-key@example.org/",
			"https://example.org/?token=private-key",
			"https://safe.example.org/",
		]);
		await request.options.onProviderStreamEvent?.(
			{
				item: {
					type: "message",
					content: [{ annotations: [{ url: "https://safe.example.org/", title: "Safe\u001b\u0007 title" }] }],
				},
			},
			request.model,
		);
		return message();
	});
	const result = await app.run("web_search", { queries: ["public query"] });
	assert.deepEqual(output(result).results[0].sources, [{ url: "https://safe.example.org/", title: "Safe title" }]);
	assert.doesNotMatch(JSON.stringify(result), /private-key/);
});

test("provider errors are bounded and masked without retrying or losing successful batch results", async () => {
	const app = harness();
	app.complete(async (request) => {
		if (app.requests.length === 1) {
			await searched(request);
			return message();
		}
		return { ...message(), stopReason: "error", errorMessage: "HTTP 429 rate limit, Bearer private-provider-token" };
	});
	const result = await app.run("web_search", { queries: ["first", "second"] });
	assert.equal(result.isError, false);
	assert.equal(app.requests.length, 2);
	assert.match(text(result), /rate limit/);
	assert.doesNotMatch(JSON.stringify(result), /private-provider-token/);
	assert.equal(result.usage?.input, 20);
});

test("search cancellation stops remaining queries and retains reported usage", async () => {
	const app = harness();
	const controller = new AbortController();
	app.complete(async (request) => {
		if (app.requests.length === 1) {
			await searched(request);
			return message();
		}
		controller.abort();
		assert.equal(request.options.signal?.aborted, true);
		return { ...message(4), stopReason: "aborted" };
	});
	const result = await app.run("web_search", { queries: ["first", "second", "third"] }, controller.signal);
	assert.equal(result.isError, true);
	assert.equal(app.requests.length, 2);
	assert.equal(result.usage?.input, 14);
	assert.match(text(result), /cancelled/);
	const before = await app.run("web_search", { queries: ["never sent"] }, controller.signal);
	assert.equal(before.isError, true);
	assert.equal(app.requests.length, 2);
});

test("search deadlines report timeout rather than an empty successful result", async (t) => {
	const controller = new AbortController();
	t.mock.method(AbortSignal, "timeout", (delay: number) => {
		assert.equal(delay, 60_000);
		return controller.signal;
	});
	const app = harness();
	app.complete(async () => {
		controller.abort();
		return { ...message(), stopReason: "aborted" };
	});
	const result = await app.run("web_search", { queries: ["public query"] });
	assert.equal(result.isError, true);
	assert.match(text(result), /timed out/);
	assert.equal(app.requests.length, 1);
});

test("GitHub source links use raw text without a browser, credentials, or redirects", async (t) => {
	const app = harness();
	const fetched: Array<{ url: string; options?: RequestInit }> = [];
	t.mock.method(globalThis, "fetch", async (url: URL, options?: RequestInit) => {
		fetched.push({ url: url.href, options });
		return new Response("first\r\nsecond\r\nthird\r\nfourth", {
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	});
	const result = await app.run("web_read", {
		urls: [
			"https://github.com/org/repo/blob/topic/branch/file.ts#L2",
			"https://raw.githubusercontent.com/org/repo/main/file.ts",
		],
		offset: 2,
		limit: 2,
	});
	assert.equal(result.isError, false);
	assert.deepEqual(
		fetched.map((r) => r.url),
		[
			"https://raw.githubusercontent.com/org/repo/topic/branch/file.ts",
			"https://raw.githubusercontent.com/org/repo/main/file.ts",
		],
	);
	assert.ok(fetched.every((r) => r.options?.redirect === "error" && r.options.signal));
	assert.deepEqual(fetched[0].options?.headers, { Accept: "text/plain" });
	assert.equal(app.executions.length, 0);
	assert.equal(app.requests.length, 0);
	assert.equal(output(result).results[0].content, "2: second\n3: third");
	assert.equal(output(result).results[0].totalLines, 4);
	assert.equal(output(result).results[0].truncated, true);
	assert.equal(output(result).results[0].endLine, 3);
	assert.equal(output(result).results[0].nextOffset, 4);
	assert.match(text(result), /2-3 of 4/);
	assert.match(text(result), /offset=4/);
});

test("page reading is local, guarded, deduplicated, and line-numbered after redirects", async () => {
	const app = harness();
	const result = await app.run("web_read", {
		urls: ["https://site.example.org/page", "https://site.example.org/page"],
		offset: 3,
		limit: 10,
	});
	assert.equal(result.isError, false);
	assert.equal(app.executions.length, 1);
	assert.equal(app.requests.length, 0);
	assert.equal(output(result).results[0].sourceUrl, "https://site.example.org/final");
	assert.equal(output(result).results[0].content, "3: third\n4: fourth");
	assert.equal(output(result).results[0].truncated, false);
	assert.equal(output(result).results[0].endLine, 4);
	assert.equal(output(result).results[0].nextOffset, undefined);
	const call = app.executions[0];
	assert.equal(call.command, "lightpanda");
	for (const flag of ["--block-private-networks", "--json", "--fail-on-http-error"])
		assert.ok(call.args.includes(flag));
	assert.ok(!call.args.some((arg) => /cookie|profile|api-key|http-header/.test(arg)));
	assert.equal(call.args.at(-1), "https://site.example.org/page");
	assert.equal(call.options?.timeout, 30_000);
	assert.ok(call.options?.signal);
});

test("credential URLs and non-web schemes are rejected without invoking a reader or echoing credentials", async (t) => {
	const app = harness();
	const fetch = t.mock.method(globalThis, "fetch", async () => {
		throw new Error("must not fetch");
	});
	for (const url of [
		"file:///etc/passwd",
		"javascript:alert(1)",
		"https://user:private-password@example.org/",
		"https://example.org/?API_KEY=private-password",
		`https://example.org/${"界".repeat(900)}`,
		"not a URL",
	]) {
		const result = await app.run("web_read", { urls: [url] });
		assert.equal(result.isError, true);
		assert.doesNotMatch(JSON.stringify(result), /private-password/);
	}
	assert.equal(app.executions.length, 0);
	assert.equal(fetch.mock.callCount(), 0);
});

test("HTTP errors, missing browser, blocked pages and malformed output are failures, not page text", async () => {
	for (const failure of [
		page("not found", { http_status: 404 }),
		page("", { error: "BlockedPrivateAddress" }),
		{ code: 1, killed: false, stdout: "invalid JSON", stderr: "private diagnostic" },
		{ code: 0, killed: true, stdout: "", stderr: "private diagnostic" },
	]) {
		const app = harness();
		app.exec(async () => failure);
		const result = await app.run("web_read", { urls: ["https://site.example.org/page"] });
		assert.equal(result.isError, true);
		assert.equal(output(result).results[0].content, "");
		assert.doesNotMatch(JSON.stringify(result), /private diagnostic/);
	}
	const app = harness();
	app.exec(async () => {
		throw Object.assign(new Error("spawn lightpanda ENOENT"), { code: "ENOENT" });
	});
	const result = await app.run("web_read", { urls: ["https://site.example.org/page"] });
	assert.equal(result.isError, true);
	assert.match(text(result), /Lightpanda.*PATH/);
});

test("raw source HTTP errors, binary responses and oversize downloads fail without browser fallback", async (t) => {
	const app = harness();
	const responses = [
		new Response("missing", { status: 404 }),
		new Response("binary", { headers: { "content-type": "image/png" } }),
		new Response("x".repeat(2 * 1024 * 1024 + 1), { headers: { "content-type": "text/plain" } }),
	];
	t.mock.method(globalThis, "fetch", async () => {
		const response = responses.shift();
		assert.ok(response);
		return response;
	});
	for (let i = 0; i < 3; i++) {
		const result = await app.run("web_read", { urls: ["https://raw.githubusercontent.com/org/repo/main/file"] });
		assert.equal(result.isError, true);
		assert.equal(output(result).results[0].content, "");
	}
	assert.equal(app.executions.length, 0);
});

test("reader cancellation aborts the active process and prevents later URLs", async () => {
	const app = harness();
	const controller = new AbortController();
	app.exec(async () => {
		controller.abort();
		assert.equal(app.executions[0].options?.signal?.aborted, true);
		return page("partial");
	});
	await assert.rejects(
		app.run("web_read", { urls: ["https://one.example.org/", "https://two.example.org/"] }, controller.signal),
		/abort/i,
	);
	assert.equal(app.executions.length, 1);
});

test("partial reader failures leave successful pages available and later offsets work", async () => {
	const app = harness();
	app.exec(async () =>
		app.executions.length === 1 ? page("missing", { http_status: 404 }) : page("first\nsecond\nthird"),
	);
	const result = await app.run("web_read", {
		urls: ["https://bad.example.org/", "https://good.example.org/"],
		offset: 2,
		limit: 2,
	});
	assert.equal(result.isError, false);
	assert.match(String(output(result).results[0].error), /404/);
	assert.equal(output(result).results[1].content, "2: second\n3: third");
	const empty = await app.run("web_read", { urls: ["https://good.example.org/"], offset: 100 });
	assert.equal(empty.isError, false);
	assert.match(text(empty), /No lines at this offset/);
	assert.equal(output(empty).results[0].endLine, undefined);
	assert.equal(output(empty).results[0].nextOffset, undefined);
});

// Byte limits can return fewer lines than requested. The cursor must not skip unread paragraphs.
test("following the reader cursor retrieves byte-limited pages without gaps or repeats", async () => {
	const app = harness();
	const original = Array.from({ length: 12 }, (_, i) => `paragraph ${i + 1}: ${"x".repeat(1500)}`);
	app.exec(async () => page(original.join("\n")));
	const collected: string[] = [];
	let offset = 1;
	let reads = 0;
	while (reads < 20) {
		const result = await app.run("web_read", { urls: ["https://site.example.org/article"], offset, limit: 12 });
		assert.equal(result.isError, false);
		reads++;
		const record = output(result).results[0];
		const returned = String(record.content).split("\n");
		collected.push(...returned);
		const last = Number(/^(\d+): /.exec(returned.at(-1) ?? "")?.[1]);
		assert.ok(Number.isInteger(last));
		assert.equal(record.endLine, last);
		assert.match(text(result), new RegExp(`${offset}-${last} of 12`));
		if (record.nextOffset === undefined) break;
		assert.ok(typeof record.nextOffset === "number");
		assert.equal(record.nextOffset, last + 1);
		assert.match(text(result), new RegExp(`offset=${record.nextOffset}\\b`));
		offset = record.nextOffset;
	}
	assert.ok(reads > 1 && reads < 20);
	assert.deepEqual(
		collected,
		original.map((line, i) => `${i + 1}: ${line}`),
	);
});

test("an oversize line is reported as skipped with a cursor to readable later lines", async () => {
	const app = harness();
	app.exec(async () => page(`${"x".repeat(16_000)}\narticle title\narticle body`));
	const result = await app.run("web_read", { urls: ["https://site.example.org/article"] });
	assert.equal(result.isError, true);
	assert.match(text(result), /Line 1.*skipped/);
	assert.equal(output(result).results[0].endLine, undefined);
	assert.equal(output(result).results[0].nextOffset, 2);
	assert.match(text(result), /offset=2/);
	const remaining = await app.run("web_read", { urls: ["https://site.example.org/article"], offset: 2 });
	assert.equal(remaining.isError, false);
	assert.equal(output(remaining).results[0].content, "2: article title\n3: article body");
	assert.equal(output(remaining).results[0].endLine, 3);
	assert.equal(output(remaining).results[0].nextOffset, undefined);
});

test("oversize redirect URLs cannot bypass structured reader output limits", async () => {
	const app = harness();
	app.exec(async () => page("page text", { url: `https://site.example.org/${"界".repeat(900)}` }));
	const result = await app.run("web_read", { urls: ["https://site.example.org/page"] });
	assert.equal(result.isError, true);
	assert.ok(Buffer.byteLength(JSON.stringify(result.structuredContent)) < 12_000);
	assert.equal(output(result).results[0].sourceUrl, undefined);
});

test("search and reader bound text and structured output, including escaping and multibyte text", async () => {
	const app = harness();
	app.exec(async () => page('\\"æ界\u001b\u0007'.repeat(10_000)));
	const read = await app.run("web_read", {
		urls: ["https://one.example.org/", "https://two.example.org/", "https://three.example.org/"],
	});
	assert.ok(Buffer.byteLength(JSON.stringify(read.structuredContent)) < 50_000);
	assert.ok(Buffer.byteLength(text(read)) < 50_000);
	assert.ok(output(read).results.every((result) => result.truncated));
	assert.ok(!text(read).includes(String.fromCharCode(27)));
	app.complete(async (request) => {
		await searched(
			request,
			Array.from({ length: 10 }, (_, i) => `https://docs.example.org/${i}/${"x".repeat(1700)}`),
		);
		return { ...message(), content: [{ type: "text", text: '\\"æ界'.repeat(10_000) }] };
	});
	const search = await app.run("web_search", { queries: ["first", "second", "third"], limit: 10 });
	assert.ok(Buffer.byteLength(JSON.stringify(search.structuredContent)) < 50_000);
	assert.ok(Buffer.byteLength(text(search)) < 50_000);
	assert.ok(output(search).results.every((result) => result.truncated));
});
