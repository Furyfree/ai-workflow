# ai-workflow

One set of rules and skills for every coding agent I use: OpenCode, Claude
Code, Codex, Grok, and Pi.

    ./install.sh              # link rules and skills into the agent homes
    ./install.sh --uninstall  # remove only the links that point here
    ./check.sh                # line budgets, skill names, shellcheck

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
| `document-analysis` | "read this PDF" - needs `mise use -g npm:@llamaindex/liteparse` |

## Vendored skills

Copied unchanged into `vendor/` (skill files only, no plugins or hooks). Read
before updating: a skill is a prompt that every agent will follow.

| Skill | Source | Commit | License |
| --- | --- | --- | --- |
| `stop-slop` | hardikpandya/stop-slop | `8da1f030185b` | MIT |
| `brainstorm` | maragudk/skills | `9859f7bceb7a` | MIT |
| `modern-python` | trailofbits/skills | `123037ec8aed` | CC-BY-SA-4.0 |
| `caveman-commit` | JuliusBrussee/caveman | `ae26f3a47755` | MIT |
| `caveman` (trial) | JuliusBrussee/caveman | `ae26f3a47755` | MIT |

## Plugins

Ponytail needs hooks, so it installs once per agent through that agent's own
plugin system. `find-skills` and `use-modern-go` stay managed by `npx skills`.

The previous pull-request and CodeRabbit workflow is at tag `v1-legacy`.

## Open

- Codex has not run these files yet; its usage limit blocked the test. After
  install, check in a fresh Codex session: `~/.codex/AGENTS.md` is loaded, the
  skills are listed, "validate this" starts `validate`, and the `codex exec`
  line in `skills/subagent/SKILL.md` returns a review.
- The `agents/openai.yaml` files (Codex display name, short description,
  default prompt per skill) were removed. Decide after that check whether
  Codex or Codex Desktop needs them back; the old ones are at `v1-legacy`.
