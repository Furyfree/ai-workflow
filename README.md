# ai-workflow

One set of rules and skills for OpenCode, Claude Code, Codex, Grok, and Pi.

```sh
nix develop --no-warn-dirty
just install              # link rules, skills, and Pi extensions
just install --force      # replace conflicts; back up real files and folders
just install --uninstall  # remove only links and MCP servers from here
```

The installer links `rules.md` as each agent's global instructions and skills
into `~/.agents/skills` or `~/.claude/skills` for Claude. It also registers the
computer-use tools with Claude once Nix has installed them; Grok reads them from
Claude. Restart agent sessions
after changing instructions; rerun the installer after adding or removing skills
or extensions. Without Nix, use Python 3 and `./install.py` with the same flags.

## Requirements

[`~/Projects/nix`](https://github.com/Furyfree/nix) installs all of this on my
machines. Elsewhere, install what the parts you use need.

| Tool | Needed for |
| --- | --- |
| [Python 3](https://www.python.org/downloads/) | `install.py`, `update_vendor.py`, `notebook` |
| [Git](https://git-scm.com/downloads) | `commit`, `pull`, `pr`, `subagent` |
| [Nix](https://nixos.org/download/) | Development: `nix develop` brings just, pnpm, uv and the checkers |
| [Claude Code](https://code.claude.com/docs/en/overview), [Codex](https://github.com/openai/codex), [OpenCode](https://github.com/anomalyco/opencode), [Grok](https://www.npmjs.com/package/@xai-official/grok), [Pi](https://github.com/earendil-works/pi) | The agents you use; `subagent` and `validate` call them |
| [GitHub CLI](https://cli.github.com/) | `pr`, `research`, Pi's git tools |
| [1Password SSH agent](https://www.1password.dev/ssh/agent) with [commit signing](https://www.1password.dev/ssh/git-commit-signing) | Signing and pushing in `commit`, `pull`, `pr` |
| [Lightpanda](https://github.com/lightpanda-io/browser) | `lightpanda`, `research`, Pi's `web_read` |
| [OpenRouter](https://openrouter.ai/) in OpenCode | `validate`'s GLM reviewer |
| [CodeRabbit CLI](https://docs.coderabbit.ai/cli) | `pr` reviews (optional) |
| [LiteParse](https://github.com/run-llama/liteparse) | `document-analysis` |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp), [Node](https://nodejs.org/en/download), [ffmpeg](https://ffmpeg.org/download.html) | `video-analysis` |
| [Craft apps](https://github.com/storytold), ffmpeg | `craft-suite`, `video-ideas`, `video-effects` |
| [computer-use-linux](https://github.com/agent-sh/computer-use-linux), [agent-workspace-linux](https://github.com/agent-sh/agent-workspace-linux), [Hyprland](https://hypr.land/) | `computer-use` |
| [Rust](https://rustup.rs/) | `rust-best-practices`, `rust-review`, `rust-port` |
| [Go](https://go.dev/dl/) | `use-modern-go`; its wrapper fetches the guidelines CLI itself |

## Development

On x86-64 Linux:

```sh
nix develop
pnpm install --frozen-lockfile --ignore-scripts
uv sync --locked
just lint
just typecheck-python
just typecheck-typescript
just test
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
| `testing` | "write tests", "what needs testing", "skriv tests" |
| `lean-docs` | "write an AGENTS.md", "debloat the docs" |
| `stop-slop` | "remove the AI tells from this text" |
| `brainstorm` | "brainstorm this idea", "turn this into a design" |
| `notebook` | "read this notebook", "læs den her notebook" |
| `document-analysis` | "read this PDF" |
| `video-analysis` | A YouTube link, "summarise this video" |
| `video-ideas` | "plan a video", "make a reel", "lav en feriefilm" |
| `video-effects` | "add a transition", "colour grade this", "lav slowmotion" |
| `craft-suite` | "edit it in FilmCraft", "klip det i FilmCraft" |
| `study` | "explain", "quiz me", "hør mig" (DTU coursework) |
| `week-overview` | "give me a week overview", "hvad skal jeg kunne i uge 4" (DTU) |
| `lightpanda` | "the page needs JavaScript", "fill in the form" |
| `research` | "look it up", "the site blocked you", "søg på nettet" |
| `computer-use` | "use the computer", "look at my screen", "brug computeren" |
| `modern-python` | "write a Python script", "skriv et Python-script" |
| `use-modern-go` | "write Go code", "fix this Go" |
| `rust-best-practices` | "write this in Rust", "skriv det i Rust" |
| `rust-review` | "review this Rust", "gennemgå Rust-koden" |
| `rust-port` | "port this to Rust", "omskriv det til Rust" |

For video editing, put the Craft app CLIs (`filmcraft-cli`, `effectcraft-cli`,
`soundcraft-cli`, `photocraft-cli`) and ffmpeg on `PATH`. LightCraft and
VectorCraft are optional; whisper.cpp (`whisper-cli`) is optional for
transcription.

## Updates and external tools

Vendor sources and licences are in [vendor/SOURCES](vendor/SOURCES).
Say "update the vendor skills", or run `just update-vendor` inside Nix with
GitHub CLI authentication. Review `git diff vendor/` before keeping changes.

- The nix repo (`~/Projects/nix`) manages agent permissions and the other
  agents' MCP servers. This repo manages instructions, links, and Claude's
  computer-use MCP servers, not accounts, model settings, or installed plugins.
- Update Ponytail with each agent's plugin command.
- Update `find-skills` with `npx skills update find-skills -g -y`.

## Pi extensions

The installer links extensions when `~/.pi/agent` exists.
See [extension usage](extensions/README.md) for setup and commands.
