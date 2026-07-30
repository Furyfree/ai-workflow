---
name: subagent
description: Delegate bounded independent work to Codex, Claude, or Grok subagents and return control to the main agent for review and integration. Use when the user asks for a subagent, fresh-context audit, provider-specific delegation, or lists multiple substantive tasks that may be independent enough to delegate.
---

# Subagent

Delegate independent work without creating an agent tree.

## Check multi-task delegation

When the user lists two or more substantive outcomes and has not already chosen
whether to delegate:

1. Inspect enough context to identify dependencies and likely file overlap.
2. Group tightly coupled tasks into one assignment.
3. Keep ordered dependency chains with the main agent.
4. Before editing or executing the tasks, show the proposed independent
   assignments and ask whether the user wants subagents for them and, if so,
   which provider or model to use.

Do not treat ordinary implementation steps such as edit, test, and report as
separate tasks. Do not ask again when the user already requested or declined
subagents, or when another skill defines the delegation.

If the user declines, the main agent completes the full flow. If the user
accepts without naming a provider or model, use native subagents with the
current model and reasoning settings. For example, six tasks that form two
independent three-task groups should normally become two assignments, not six.

## Select provider and model

- With no provider or model request, use the current client's native subagent
  tool and inherit the current model and reasoning settings.
- For `subagent codex`, `subagent claude`, or `subagent grok`, use that provider
  when its native tool or CLI is available and authenticated.
- When the user names a model, use that exact model if available.
- If the requested provider is unavailable, report that. Do not silently
  substitute another provider.

When the user selects a provider but no model, use its latest stable flagship
at `high` reasoning. Prefer a provider-maintained flagship alias when one is
documented. The current verified command values are:

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
codex -a never exec --ignore-user-config \
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
sandbox and command rules remain enforced. Claude receives only file-reading
tools. Grok auto-approves tool calls inside its read-only sandbox; the sandbox,
disabled web search, and disabled auto-update remain the safety boundary.

These commands are for audits. For user-approved implementation delegation,
prefer native subagent tools. Give each subagent write access only to its
assigned repository or worktree and the tools needed for focused checks. When
an external CLI is required, inspect its current help and use its bounded
workspace-write or edit-accepting mode; never bypass its sandbox. Prefer a
separate worktree when supported. If isolation is unavailable, run editing
subagents concurrently only when their assigned paths cannot overlap.

Do not change authentication, configuration, or permissions to make a provider
work.

If authentication, subscription, entitlement, rate limits, or model
availability block the requested provider, report the exact state and ask
whether to use a currently available stable model. Do not silently select a
preview, labs, experimental, cheaper, or different-provider model.

## Use Codex operator controls

In Codex, the user may use:

- `/status` to inspect the active model, reasoning, permissions, workspace, and
  context
- `/usage` before a costly fan-out
- `/agent` or `/subagents` to inspect and switch between agent threads
- `/worktree` in supported clients to isolate an editing thread

These are user interface controls, not steps the skill should claim to perform.
The assignment boundaries and main-agent review below still apply.

## Refresh model defaults

When the verified flagship changes, update the concrete command examples in
this repository's skill source and related canonical documents, then validate
the repository. Do not edit live agent configuration.

A model refresh authorizes local repository edits only. Commit, push, and
pull-request creation or update still require an explicit request naming that
publication action.

## Define each bounded assignment

Give the subagent:

- the repository or artifact path
- one outcome, its dependencies, and an exact path or component boundary
- the expected output
- the stop condition

Do not give it the main agent's diagnosis or expected findings. Tell it not to
spawn subagents, commit, push, publish, merge, install, deploy, change live
configuration, or change other external state.

For an audit, require read-only work. For approved implementation delegation,
allow edits and focused validation only inside the assignment. Never give two
concurrent editing subagents overlapping ownership.

## Return control

Wait for every assignment. The main agent then:

- verifies findings and claimed checks against source evidence
- reviews each subagent diff for scope, correctness, style, and overlap
- reconciles or refines the edits instead of accepting them blindly
- completes integration work that spans assignments
- runs the final focused checks and repository gate

Compare the worktree before and after every audit subagent. Stop if it changed
anything despite the read-only request.

Do not replace a completed assignment with another subagent merely to review
it; the main agent is the reviewer. Do not start a delegation loop unless the
user or calling workflow explicitly defines a bounded loop.
