# ai-workflow

One set of rules and skills for every coding agent I use: OpenCode, Claude
Code, Codex, Grok, and Pi.

    ./install.sh              # link rules and skills into the agent homes
    ./install.sh --force      # also replace what is in the way; real files are backed up
    ./install.sh --uninstall  # remove only the links that point here
    ./check.sh                # skill names, vendor sources, shellcheck, selftest

`rules.md` is linked as each agent's global instruction file. Skills are
linked into `~/.agents/skills` (OpenCode, Codex, Grok, Pi) and
`~/.claude/skills`. Edits here apply at once; rerun `install.sh` only after
adding or removing a skill.

## Skills

Say what you want, or name the skill: "use the pr skill".

| Skill | Say |
| --- | --- |
| `validate` | "validate this", "second opinion", "valider" |
| `pr` | "make a PR", "lav en PR", "check the PR" |
| `subagent` | "use subagents", "ask opus to ...", "have grok check" |
| `lean-docs` | "write an AGENTS.md", "debloat the docs" |
| `notebook` | "read this notebook", "læs den her notebook" |
| `document-analysis` | "read this PDF" - needs `mise use -g npm:@llamaindex/liteparse` |

## Vendored skills

Foreign skills are copied unchanged into `vendor/`; sources, commits, and
licenses are in `vendor/SOURCES`. Say "update the vendor skills", or run
`./update-vendor.sh` and read `git diff vendor/` before keeping anything: a
skill is a prompt every agent obeys. `use-modern-go` needs Go installed.

## External

- Ponytail needs hooks, so it is a plugin in each agent. Update it with that
  agent's own plugin command.
- `find-skills`: `npx skills update find-skills -g -y`.

The previous pull-request and CodeRabbit workflow is at tag `v1-legacy`.

## Open

- Codex has not run these files yet; its usage limit blocked the test. After
  install, check in a fresh Codex session: `~/.codex/AGENTS.md` is loaded, the
  skills are listed, "validate this" starts `validate`, and the `codex exec`
  line in `skills/subagent/SKILL.md` returns a review.
- The `agents/openai.yaml` files (Codex display name, short description,
  default prompt per skill) were removed. Decide after that check whether
  Codex or Codex Desktop needs them back; the old ones are at `v1-legacy`.
