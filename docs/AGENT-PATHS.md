# Agent paths

The installer keeps one shared instruction source and renders it into the user
locations supported by each agent.

## Codex

Installed instructions:

```text
${CODEX_HOME:-$HOME/.codex}/AGENTS.md
```

Installed skills:

```text
${AGENTS_HOME:-$HOME/.agents}/skills/<skill-name>/
```

Codex reads a global `AGENTS.md` from its home and then adds project
instructions from the repository root down to the working directory. Codex
supports user skills under `~/.agents/skills` and follows symlinked skill
directories.

References:

- [Codex AGENTS.md discovery](https://developers.openai.com/codex/codex-manual#custom-instructions-with-agentsmd)
- [Codex skill locations](https://developers.openai.com/codex/codex-manual#build-skills)

## Claude Code

Installed instructions:

```text
${CLAUDE_CONFIG_DIR:-$HOME/.claude}/CLAUDE.md
```

Installed skills:

```text
${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/<skill-name>/
```

Claude Code loads user instructions from `~/.claude/CLAUDE.md` and personal
skills from `~/.claude/skills`. Project templates include a thin `CLAUDE.md`
that routes Claude to the canonical repository `AGENTS.md`.

References:

- [Claude Code memory and CLAUDE.md](https://code.claude.com/docs/en/memory)
- [Claude Code skills](https://code.claude.com/docs/en/slash-commands)

## Boundaries

The installer does not manage:

- agent authentication
- models or reasoning defaults
- MCP servers
- permissions, trust, sandbox, or approval policy
- hooks or auto-memory
- plugins or CodeRabbit installation

Those settings have different security and portability requirements and remain
outside the first release.
