# Claude Code adapter

- Claude Code project instructions are discovered through `CLAUDE.md`.
- When a project `CLAUDE.md` routes to `AGENTS.md`, read and follow that file
  before planning or changing the repository.
- User skills are installed under `~/.claude/skills` unless
  `CLAUDE_CONFIG_DIR` selects another location.
- Invoke a skill explicitly with `/skill-name` when automatic selection is
  uncertain.
- Keep Claude settings, permissions, hooks, MCP servers, authentication, and
  auto-memory outside this workflow package.
