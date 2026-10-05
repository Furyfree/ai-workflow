# ai-workflow

One set of rules and skills for every coding agent I use: OpenCode, Claude
Code, Codex, Grok, and Pi.

    nix develop --no-warn-dirty
    just install              # link rules and skills into the agent homes
    just install --force      # replace conflicts; back up real files and folders
    just install --uninstall  # remove only the links that point here

`rules.md` is linked as each agent's global instruction file. Skills are
linked into `~/.agents/skills` (OpenCode, Codex, Grok, Pi) and
`~/.claude/skills`. Links always point to the current files; start a fresh
session to load changed instructions. Rerun `install.py` after adding or
removing a skill. The installer uses Python 3's standard library and also
works standalone as `./install.py`.

## Development

On x86-64 Linux:

```sh
nix develop
pnpm install --frozen-lockfile --ignore-scripts
uv sync --locked
just lint
just typecheck-python
```

Run Just inside `nix develop`, or use `nix develop --command just lint`.
`--no-warn-dirty` hides the uncommitted-changes warning. Nix supplies the
locale archive without changing your locale. For an untracked flake, use
`nix develop path:.` until it is tracked.
`just lint` checks Python, TypeScript, and JSON, including formatting.
`just format` formats them. `just typecheck-python` uses basedpyright;
`just typecheck-typescript` uses TypeScript and needs source files to check.
Nix supplies Python 3.13 and uv; `uv.lock` pins Ruff. pnpm's version matches
the pinned Nix shell. `.venv` and Node types supply editor support.

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
| `study` | "explain", "forklar", "quiz me", "hør mig" - only when the path or context mentions DTU |
| `lightpanda` | "the page needs JavaScript", "fill in the form" - needs `lightpanda` from Mise |

`video-analysis` uses `yt-dlp` (Fedora package managed by Nimbus), Node from
Mise, and ffmpeg when inspecting video frames. A bare link prompts for
summary or transcript; instructions or conversation context take precedence.

## Vendored skills

Foreign skills are copied unchanged into `vendor/`; sources, commits, and
licenses are in `vendor/SOURCES`. Say "update the vendor skills", or run
`just update-vendor` inside Nix and read `git diff vendor/` before keeping
anything: a skill is a prompt every agent obeys. `update_vendor.py` uses the
GitHub CLI's authentication. `use-modern-go` needs Go installed.
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

## Pi extensions

The [wanted-extension list](extensions/README.md) is kept here; implementations
and extension installation will return separately.
