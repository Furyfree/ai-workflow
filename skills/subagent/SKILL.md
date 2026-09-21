---
name: subagent
description: Hand work to another agent or model - native subagents, or the claude, grok, codex, and opencode CLIs. Use when the user says "use a subagent", "use subagents", "brug subagents", or names a model - "get opus to check this", "ask grok", "have codex review", "få opus til at tjekke", "spørg grok". Never start subagents the user did not ask for.
---

# Subagent

## Which agent

- No provider named: use this harness's native subagents.
- Provider or model named: use that vendor's own CLI, which runs on the user's
  subscription. Never reach Claude, Grok, or GPT through OpenRouter or
  opencode unless the user says so.

| The user says | CLI | List its models |
| --- | --- | --- |
| claude, fable, opus, sonnet, haiku | `claude` | aliases in `claude --help` under `--model` |
| grok | `grok` | `grok models` |
| codex, gpt | `codex` | no list command: omit `-m` for the default, or pass the id the user names |
| anything else (glm, deepseek, qwen ...) | `opencode` | `opencode models [provider]` |

Never write a model name from memory. Look it up with the command above and
pick the entry that matches what the user said ("opus 5" -> the `opus` alias).
If nothing matches, show the closest three and ask.

## Which model

Match the model to the task. Do not default to the largest model at the
highest reasoning setting.

- Search, read, list, summarise: the smallest, fastest model.
- Ordinary edits and tests with a clear spec: a mid model.
- Design, hard debugging, security, final review: the flagship.

A model the user names always wins. Run only the models the user named.
For a review, give it the validate contract: read-only, findings only,
`file:line`, smallest fix, "LGTM" when nothing is actionable.

## Run it

Write the whole task to a prompt file first: `p=$(mktemp)`. The subagent sees
none of this conversation: give it paths, the goal, what to return, and a
word limit. Leave out the bracketed model flag to use that CLI's default;
opencode always needs `-m`. Some native subagents have no model choice;
then skip the model step.

    timeout -k 5 600 claude -p [--model <alias>] --permission-mode plan <"$p"
    timeout -k 5 600 grok --prompt-file "$p" [-m <model>] --permission-mode plan </dev/null
    timeout -k 5 600 codex exec [-m <model>] -s read-only -o "$p.out" - <"$p"
    timeout -k 5 600 opencode run -m <provider/model> --agent plan -f "$p" -- "Follow the attached file." </dev/null

Codex writes its final answer to the `-o` file; outside a Git repository add
`--skip-git-repo-check`. These modes ask for read-only behaviour; they are not
a sandbox. Let a subagent edit only when the user asked for that:
find the edit mode in `--help`, swap it for `plan` or `read-only`, and give
each subagent its own files so none overlap. Flags change; check `--help`
when one is rejected.

- Run independent subagents in parallel and ordered steps yourself.
- Subagents never start subagents.
- One that times out is reported as unavailable. Do not retry it silently.
- Check the results against the code before using them, and say which model
  did what.
