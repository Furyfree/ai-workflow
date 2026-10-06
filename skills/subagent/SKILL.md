---
name: subagent
description: Hand work to another agent or model - native subagents, or the claude, grok, codex, opencode, and pi CLIs. Use when the user says "use a subagent", "use subagents", "brug subagents", or names a model - "ask grok", "have codex review this", "get opus to check", "ask pi", "spørg grok", "få codex til at tjekke". Not for the default set of reviewers; use validate.
---

# Subagent

## Which agent

- Honour an explicit CLI request; never replace it with a native subagent.
- No provider or model named: use native subagents. If there are none, ask.
- Provider or model named: use its own CLI below. Use a native subagent only
  if its provider and any requested model are verified and no CLI was requested.
- Never reach Claude, Grok, or GPT through OpenCode or OpenRouter unless the
  user says so. At a usage limit, ask whether to use OpenCode and wait;
  never switch providers or models automatically.

CLI routes:

| The user says | CLI | List its models |
| --- | --- | --- |
| claude, fable, opus, sonnet, haiku | `claude` | aliases in `claude --help` under `--model` |
| grok | `grok` | `grok models` |
| codex, gpt | `codex` | no list command: omit `-m` for the default, or pass the id the user names |
| pi | `pi` | `pi --list-models [search]` |
| anything else (glm, deepseek, qwen ...) | `opencode` | `opencode models [provider]` |

Never write a model name from memory. Use the native tool's model list or,
after the permission check below, the CLI command above. Then
pick the matching entry; verify that an alias resolves to the requested model.
If nothing matches, show the closest three and ask.

## Which model

Match the model and reasoning to the task, following the shared rules.
When the route offers no model choice or discovery, use its default unless
the user names a model. Run only the models the user named when they specify
a set. Use only reasoning settings supported by the selected model and tool.
For reviews, follow [validate](../validate/SKILL.md), keeping the requested
model set. Native reviewers receive its [prompt](../validate/prompt.txt).

## Native subagents

Pass the task directly to the native tool; no prompt file or CLI is needed.
Give it the goal, paths, constraints, expected output, and a word limit.
Use the tool's supported model and context options. Conversation inheritance
depends on the harness and those options; supply any context it will not get.
Pass the shared permission rules explicitly; research agents may skip rule files.
Use a verified read-only agent or sandbox, not a role name alone. Check the
actual model when the harness reports it; reject substitutions.
Allow only one editor at a time, including the parent. Parallel reads are fine.
Use native controls to collect results, send follow-ups, and stop hangs.

- Claude: use restricted research tools; do not enable agent teams. Model
  allowlists can substitute another model. Check the reported identity.
- Codex: children inherit the live parent sandbox. `explorer` alone does not
  make a child read-only. Model and reasoning overrides depend on the tool.
- Grok: `explore` and `plan` omit shell and editing tools. Check which native
  controls the session exposes; do not assume CLI flags apply to native agents.
- OpenCode: children use their own permissions, not a subset of the parent's.
  Use Explore for reads and verify any custom agent's permissions.
- Pi with this repository's `subagent` tool: use it for Pi children and explicit
  CLI requests. It manages waiting, background results, inspection, and stopping.
  One-shot runners do not support steering or continuing a child session.

## External CLIs

Before model discovery or execution, check the session's filesystem and
network permissions. A CLI needs network access and writes to its own logs
and cache, even for a read-only review. If the harness blocks that, report
it and stop that provider. Never work around the sandbox or switch model.

Give the CLI a self-contained task; it does not inherit this conversation.
[run.sh](run.sh) owns CLI flags and the time limit. It sits next to this
SKILL.md. Set `dir` to the absolute path of the directory this file was
loaded from; never assume the working directory.

    printf '%s\n' "$prompt" | "$dir/run.sh" <cli> [model] [effort]

It reads the task from stdin and prints the answer. For Grok and OpenCode,
it creates and removes a temporary prompt file to support large tasks.
An empty model argument uses the CLI default; OpenCode needs `provider/model`.
Pass the chosen effort explicitly, using only settings the CLI supports.
Omitting effort keeps the CLI default. Report a nonzero exit as unavailable.

Modes, set before the CLI name (`--events` is internal to the Pi manager):

- none: read-only. Claude gets file-reading tools; Grok also selects its
  read-only sandbox. Codex selects read-only for sandboxed commands. OpenCode
  V2 gets a temporary reading-only agent, not Plan. Pi gets read, grep, find,
  and ls without extensions.
- `--review`, used by `validate`: Claude gets an empty tool list. Grok keeps
  its file-reading tools because it treats an empty list as all tools.
  Codex and OpenCode stay as in read-only mode. Pi gets no tools.
- `--edit`: only when the user authorised edits. Uses the CLI's saved permissions.

Every call stops after ten minutes, edits too. The Pi manager owns the deadline
and process group for `--events`; never use that flag as a standalone runner. Split editing work into tasks
that finish well inside that. An edit that times out may leave partial changes:
run `git status` and `git diff`, show the user what changed, and wait.
Never retry or clean up those edits on your own.

Codex and Grok select filesystem sandboxes; tool lists and OpenCode permissions
are not OS sandboxes. Trusted CLI hooks, MCP servers, and saved permissions
need separate checks; the Codex command sandbox does not confine remote tools.
Editing scope is an instruction, not filesystem enforcement. Native delegation
is disabled where supported; no command can stop arbitrary shell code from
starting another program. Never claim stronger isolation than the route provides.
OpenCode V2 uses `provider/model#variant` and a private server so stopping the
owned process also stops its task. An existing `OPENCODE_CONFIG_CONTENT`
override is a blocker; never overwrite it silently.
If a flag is rejected, check the CLI's `--help` and report the mismatch.

- Run independent read-only subagents in parallel and ordered steps yourself.
- Background work needs an explicit request; wait by default. In Pi, finished
  background jobs reach the parent only when it is idle, outside user dialogs.
- Subagents never start subagents.
- One that times out is reported as unavailable. Do not retry it silently.
- Check the results against the code before using them, and say which model
  did what.
