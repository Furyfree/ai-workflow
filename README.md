# ai-workflow

One set of rules and skills for OpenCode, Claude Code, Codex, Grok, and Pi.

```sh
nix develop --no-warn-dirty
just install              # link rules, skills, and Pi extensions
just install --force      # replace conflicts; back up real files and folders
just install --uninstall  # remove only links that point here
```

The installer links `rules.md` as each agent's global instructions and skills
into `~/.agents/skills` or `~/.claude/skills` for Claude. Restart agent sessions
after changing instructions; rerun the installer after adding or removing skills
or extensions. Without Nix, use Python 3 and `./install.py` with the same flags.

## Development

On x86-64 Linux:

```sh
nix develop
pnpm install --frozen-lockfile --ignore-scripts
uv sync --locked
just lint
just typecheck-python
just typecheck-typescript
pnpm test
```

Use `just format` to format code. Run Just inside the Nix shell.

## Skills

Say what you need, or name a skill: "use the pr skill".

| Skill | Say |
| --- | --- |
| `validate` | "validate this", "second opinion", "valider" |
| `pr` | "make a PR", "lav en PR", "check the PR" |
| `commit` | "/commit", "commit and push", "lav et commit" |
| `pull` | "/pull", "pull the latest", "hent ændringer" |
| `subagent` | "use subagents", "ask opus to ..." |
| `lean-docs` | "write an AGENTS.md", "debloat the docs" |
| `notebook` | "read this notebook", "læs den her notebook" |
| `document-analysis` | "read this PDF"; needs `mise use -g npm:@llamaindex/liteparse` |
| `video-analysis` | A YouTube link, "summarise this video" |
| `video-ideas` | "plan a video", "make a reel", "lav en feriefilm" |
| `video-effects` | "add a transition", "colour grade this", "lav slowmotion" |
| `craft-suite` | "edit it in FilmCraft", "lav det i ArtCraft" |
| `study` | "explain", "quiz me", "hør mig" (DTU coursework) |
| `week-overview` | "give me a week overview", "hvad skal jeg kunne i uge 4" (DTU) |
| `lightpanda` | "the page needs JavaScript", "fill in the form"; needs Lightpanda from Mise |

For video analysis, install `yt-dlp`, Node from Mise, and ffmpeg for frames.
For video editing, put the ArtCraft CLIs (`filmcraft-cli`, `effectcraft-cli`,
`soundcraft-cli`, `photocraft-cli`) and ffmpeg on `PATH`.
`use-modern-go` needs Go installed.

## Updates and external tools

Vendor sources and licences are in [vendor/SOURCES](vendor/SOURCES).
Say "update the vendor skills", or run `just update-vendor` inside Nix with
GitHub CLI authentication. Review `git diff vendor/` before keeping changes.

- Chezmoi in `~/Projects/dotfiles` manages agent permissions. This repo manages
  instructions and links, not accounts, model settings, or installed plugins.
- Update Ponytail with each agent's plugin command.
- Update `find-skills` with `npx skills update find-skills -g -y`.

## Pi extensions

The installer links extensions when `~/.pi/agent` exists.
See [extension usage](extensions/README.md) for setup and commands.
