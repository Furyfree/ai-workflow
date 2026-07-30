# ai-workflow

Portable coding-agent instructions, reusable skills, project templates, and a
reviewable AI-assisted development workflow.

The repository supports Codex and Claude Code without copying their complete
configuration directories or weakening their permissions.

## Included

- One shared global instruction source
- Thin Codex and Claude Code adapters
- `ai-project-manager`, `pr-readiness`, and `html-plan` skills
- Project templates for `AGENTS.md`, `CLAUDE.md`, `SPEC.md`, `ROADMAP.md`, and
  `TASKS.md`
- Previewable copy or link installation
- Manifest-based backup, rollback, uninstall, and recovery
- One canonical local validation command
- Ubuntu, Debian, and Fedora container checks
- Pull-request template, GitHub Actions, and Dependabot

## Start safely

Run the complete local gate:

```sh
./scripts/validate.sh
```

Preview installation without changing agent homes:

```sh
./scripts/install.sh --dry-run
```

Read [docs/INSTALLATION.md](docs/INSTALLATION.md) before installing.

## Repository map

```text
global/                 Shared instructions and agent adapters
.agents/skills/         Canonical reusable skills
scripts/                Installation, recovery, tests, and validation
tests/                  Skill cases and deterministic fixtures
containers/             Linux distribution validation images
.github/                Pull-request and CI configuration
docs/                   Workflow, implementation, and operational references
```

## Project documents

- [AGENTS.md](AGENTS.md): repository maintenance instructions
- [SPEC.md](SPEC.md): requirements, boundaries, and acceptance criteria
- [ROADMAP.md](ROADMAP.md): ordered outcomes and exit criteria
- [TASKS.md](TASKS.md): current work and validation state
- [docs/WORKFLOW.md](docs/WORKFLOW.md): development lifecycle
- [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md): component explanations
- [docs/DECISIONS.md](docs/DECISIONS.md): accepted design choices

## Reference guides

- [Agent paths](docs/AGENT-PATHS.md)
- [Skills](docs/SKILLS.md)
- [Installation and recovery](docs/INSTALLATION.md)
- [GitHub workflow](docs/GITHUB.md)

## Boundaries

This repository does not install agents or CodeRabbit, authenticate services,
manage models or MCP servers, or change trust, sandbox, approval, permission,
hook, deployment, or infrastructure settings.
