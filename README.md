# ai-workflow

One set of rules and skills for every coding agent I use: OpenCode, Claude
Code, Codex, Grok, and Pi.

    ./install.sh              # link rules and skills into the agent homes
    ./install.sh --force      # also replace what is in the way; real files are backed up
    ./install.sh --uninstall  # remove only the links that point here
    ./check.sh                # structure, shellcheck, notebook and CLI checks

`rules.md` is linked as each agent's global instruction file. Skills are
linked into `~/.agents/skills` (OpenCode, Codex, Grok, Pi) and
`~/.claude/skills`. Links always point to the current files; start a fresh
session to load changed instructions. Rerun `install.sh` after adding or
removing a skill.

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
| `video-analysis` | A YouTube link, "summarise this video", "transskriber videoen" |
| `lightpanda` | "the page needs JavaScript", "fill in the form" - needs `lightpanda` from Mise |

`video-analysis` uses `yt-dlp` (Fedora package managed by Nimbus), Node from
Mise, and ffmpeg when inspecting video frames. A bare link prompts for
summary or transcript; instructions or conversation context take precedence.

## Vendored skills

Foreign skills are copied unchanged into `vendor/`; sources, commits, and
licenses are in `vendor/SOURCES`. Say "update the vendor skills", or run
`./update-vendor.sh` and read `git diff vendor/` before keeping anything: a
skill is a prompt every agent obeys. `use-modern-go` needs Go installed.
A skill in `skills/` with a vendor skill's name replaces it and reads the
vendor copy by relative link (`modern-python`, `lightpanda`). A vendor skill
linked this way, such as `pandascript`, is not installed on its own.

## External

- Chezmoi in `~/Projects/dotfiles` owns persistent agent permission settings.
  This repo owns instructions, skills, and their links; it does not reproduce
  account state, local model settings, or installed plugins.
- Ponytail needs hooks, so it is a plugin in each agent. Update it with that
  agent's own plugin command.
- `find-skills`: `npx skills update find-skills -g -y`.

The previous pull-request and CodeRabbit workflow is at tag `v1-legacy`.

## Pi extensions

`install.sh` links `extensions/pi/*.ts` into `~/.pi/agent/extensions` when
`~/.pi/agent` exists. `git-commit.ts` adds `/gencommit`, which drafts a
message, and `/commit`, which drafts one, opens it for you to edit (empty
cancels), then commits what is staged, or everything with `--all`. It never
pushes. Its MIT license is in `extensions/LICENSE`.

## Open

- Still to check: whether "validate this" triggers `validate` in a live Codex
  session, and whether Codex Desktop needs `agents/openai.yaml` to display
  skills (the old files are at `v1-legacy`).
