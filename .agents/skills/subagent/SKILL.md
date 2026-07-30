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

Prefer native subagent tools. When an external CLI is required, first inspect
its current help. Suitable read-only starting points are:

```sh
codex exec --ignore-user-config --ignore-rules --sandbox read-only \
  --ephemeral -C REPOSITORY PROMPT
(cd REPOSITORY && claude --print --permission-mode plan \
  --no-session-persistence PROMPT)
grok --cwd REPOSITORY --single PROMPT --permission-mode plan \
  --no-subagents --no-memory --disable-web-search
```

Do not change authentication, configuration, or permissions to make a provider
work.

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
