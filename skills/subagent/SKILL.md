---
name: subagent
description: Hand work to another agent or model - native subagents, or the claude, grok, codex, and opencode CLIs. Use when the user says "use a subagent", "use subagents", "brug subagents", or names a model - "ask grok", "have codex review this", "get opus to check", "spørg grok", "få codex til at tjekke". Not for the default set of reviewers; use validate.
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
Check whether agents share files. Give each editing agent separate files.
Use the native tools to collect results, send follow-ups, and stop hangs.

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

Modes, set before the CLI name:

- none: read-only. Claude and Grok get file-reading tools, Codex runs in its
  read-only sandbox, OpenCode uses its plan agent.
- `--review`, used by `validate`: Claude gets an empty tool list. Grok keeps
  its file-reading tools because it treats an empty list as all tools.
  Codex and OpenCode stay as in read-only mode.
- `--edit`: only when the user authorised edits. Uses the CLI's saved permissions.

Every call stops after ten minutes, edits too. Split editing work into tasks
that finish well inside that. An edit that times out may leave partial changes:
run `git status` and `git diff`, show the user what changed, and wait.
Never retry or clean up those edits on your own.

Of these commands, only the Codex one selects a filesystem sandbox.
If a flag is rejected, check the CLI's `--help` and report the mismatch.

- Run independent subagents in parallel and ordered steps yourself.
- Subagents never start subagents.
- One that times out is reported as unavailable. Do not retry it silently.
- Check the results against the code before using them, and say which model
  did what.
