# ai-workflow

One rules file and a few skills, linked into every coding agent I use:
OpenCode, Claude Code, Codex, Grok, and later Pi.

## What must not break

- `rules.md` stays short; every session of every model reads all of it.
- Skills start from plain words in every agent and model. No slash commands.
- Rules: imperative, "never" and "only", the exception next to its rule.
  Skill descriptions: quoted phrases I really type, in English and Danish,
  plus a "Not ..." line. Cheap models match them literally.
- Non-goals: review policy in `rules.md`, planning docs, an installer that
  edits agent config files.

## Map

- `rules.md`: the global rules. A new habit of mine goes here, one bullet.
- `skills/<name>/SKILL.md`: my skills. New trigger phrases go in `description`.
- `skills/validate/run.sh`: the validator commands. CLI flag changes go here.
- `skills/subagent/SKILL.md`: how to reach other models. No versioned ids.
- `vendor/<name>/`: foreign skills, copied unchanged. To update one, copy the
  new upstream files and the new commit into the README table. Never edit.
- `install.sh`: the link targets per agent. A new agent is one line here.
- `check.sh`: line budgets. When one fails, cut text; do not raise it.
- Pi extensions later: `extensions/` plus a root `package.json`. Not before.

## Ways to hurt yourself

- Do not run `install.sh` or touch `~/.claude`, `~/.codex`, `~/.agents`,
  `~/.grok`, `~/.config/opencode`, or `~/.pi` unless I ask. They are live.
- Skills are linked, not copied: an edit here changes every agent at once.

## Verify

`./check.sh`. For `install.sh`, run it with `HOME` set to a temp directory.

## Git

When I ask for a commit, it goes on main.
