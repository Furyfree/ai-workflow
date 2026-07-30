---
name: subagent
description: Delegate one bounded independent task to a Codex, Claude, or Grok subagent and return its findings to the main agent. Use when the user asks for a subagent, fresh-context audit, independent second opinion, provider-specific delegation, or when another skill explicitly calls for one subagent pass.
---

# Subagent

Delegate one independent task without creating an agent tree.

## Select the provider

- With no provider request, use the current client's native subagent tool.
- For `subagent codex`, `subagent claude`, or `subagent grok`, use that provider
  when its native tool or CLI is available and authenticated.
- If the requested provider is unavailable, report that. Do not silently
  substitute another provider.

Use the latest stable flagship from the requested provider at `high`
reasoning. Prefer a provider-maintained flagship alias when one is documented.
The current verified command values are:

- Codex: `gpt-5.6-sol`
- Claude: `opus`, Anthropic's maintained alias for the latest Opus model
- Grok: `grok-4.5`

Treat concrete versioned IDs as current defaults, not permanent pins. Before
an external run, verify the latest stable flagship through the installed
client's model listing or official provider documentation unless current
evidence already exists in the same task. Pass the resolved model and `high`
reasoning explicitly when a native subagent tool supports those overrides; do
not rely on inherited defaults.

Prefer native subagent tools. When an external CLI is required, first inspect
its current help, authentication, and available models where the CLI exposes
them. Suitable bounded read-only starting points are:

```sh
codex -a never exec --ignore-user-config --ignore-rules \
  --sandbox read-only --ephemeral -m gpt-5.6-sol \
  -c 'model_reasoning_effort="high"' -C REPOSITORY PROMPT
(cd REPOSITORY && claude --print --model opus --effort high \
  --permission-mode dontAsk --tools "Read,Glob,Grep" --max-turns 20 \
  --no-session-persistence PROMPT)
grok --cwd REPOSITORY --single PROMPT --model grok-4.5 --effort high \
  --sandbox read-only --always-approve --max-turns 20 --no-plan \
  --no-subagents --no-memory --disable-web-search --no-auto-update
```

The Codex approval override prevents interactive prompts while its read-only
sandbox remains enforced. Claude receives only file-reading tools. Grok
auto-approves tool calls inside its read-only sandbox; the sandbox, disabled
web search, and disabled auto-update remain the safety boundary.

Do not change authentication, configuration, or permissions to make a provider
work.

If authentication, subscription, entitlement, rate limits, or model
availability block the requested provider, report the exact state and ask
whether to use a currently available stable model. Do not silently select a
preview, labs, experimental, cheaper, or different-provider model.

## Refresh model defaults

When the verified flagship changes, update the concrete command examples in
this repository's skill source and related canonical documents, then validate
the repository. Do not edit live agent configuration.

A model refresh authorizes local repository edits only. Commit, push, and
pull-request creation or update still require an explicit request naming that
publication action.

## Define one bounded task

Give the subagent:

- the repository or artifact path
- a narrow scope and read-only constraint
- the expected output
- the stop condition

Do not give it the main agent's diagnosis or expected findings. Tell it not to
spawn subagents, edit files, publish, install, or change external state.

## Return control

Run one subagent and wait for its result. The main agent verifies every finding
against the source before acting and owns all edits and validation.

Compare the worktree before and after an external subagent. Stop if it changed
anything despite the read-only request.

Do not start another subagent unless the calling workflow explicitly defines a
bounded loop.
