# AI workflow specification

## Problem

Coding-agent setup is often copied between machines and repositories without a
clear boundary between reusable workflow, project requirements, and private
runtime state. Agent-specific instruction formats also encourage duplicated
rules that drift apart.

## Users

The primary user is a developer working across multiple repositories who wants
the same safe planning, implementation, review, and installation workflow with
more than one coding agent.

## Required behavior

- Store shared coding-agent behavior once.
- Support Codex and Claude Code through thin adapters first.
- Allow future adapters without rewriting shared skills or project templates.
- Install selected global instructions and reusable skills.
- Keep project requirements and commands in project repositories.
- Provide adaptable templates for `AGENTS.md`, `SPEC.md`, `ROADMAP.md`, and
  `TASKS.md`.
- Preview installation without changing the target system.
- Back up conflicting managed files before replacement.
- Support safe repeated installation and recovery.
- Record managed targets and installed fingerprints in a machine-readable
  manifest.
- Validate repository structure, skills, adapters, templates, scripts, and
  installer behavior.
- Test the supported Linux workflow on selected distribution containers.
- Keep external state changes behind explicit user intent.

## Architecture

Component ownership:

- Root planning documents define how this repository is maintained.
- `global/` stores shared global guidance and agent adapters.
- `.agents/skills/` stores canonical reusable skills.
- `scripts/` stores deterministic installation and validation automation.
- `.github/` stores pull-request templates and CI.
- `containers/` stores Linux portability environments.
- `tests/` stores deterministic fixtures and realistic skill case inventories.
- `docs/` stores reference material that is loaded only when routed.

The canonical skill source is `.agents/skills/`. Each adapter must use a
verified discovery or installation path for its agent. Do not assume all agents
load the same filenames or directories.

## Global instructions

Shared global behavior should cover:

- repository instruction discovery
- preservation of unrelated changes
- small reviewable changes
- validation and honest reporting
- secrets and private-state boundaries
- destructive and external-action authorization
- explicit stop points
- routing detailed workflows to skills

Global instructions must not contain:

- repository-specific commands or hazards
- host-specific paths
- language-specific style rules
- copied skill procedures
- credentials or private state
- broad trust, sandbox, approval, or command allowlists

## Initial skills

### `ai-project-manager`

- Inspect existing instructions, plans, branch state, and changes.
- Create or reconcile planning documents only when requested.
- Find conflicts, missing requirements, risks, and decisions.
- Define acceptance criteria, validation, rollback, and pause points.
- Implement one approved phase at a time.
- Update task status only after validation.

### `pr-readiness`

- Inspect the complete diff and untracked files.
- Separate unrelated changes.
- Run focused checks and the repository's full local gate.
- Run local CodeRabbit when available.
- Record skipped or unavailable checks.
- Verify CI, reviews, and threads against the latest commit.
- Stop before unauthorized commit, push, PR, or merge actions.

### `html-plan`

- Visualize broad plans, architecture, dependencies, comparisons, and status.
- Choose a visual only when it improves understanding.
- Generate self-contained HTML without required network assets.
- Use semantic, accessible, responsive, and print-friendly output.
- Link back to canonical Markdown sources.
- Render and inspect the result when browser tooling is available.
- Keep HTML derived; never make it a second specification or roadmap.

## Installer

The first installer is Bash and targets Linux, Codex, and Claude Code.

Required behavior:

- dry-run
- explicit source and target paths
- create, update, skip, and conflict reporting
- timestamped backups
- idempotence
- validation after installation
- isolated integration tests
- documented recovery or uninstall
- a current machine-readable manifest
- rollback after an interrupted mutation

Copy mode is the stable default. Link mode is an explicit option for developing
this repository locally. Rendered instruction files are always copied.

## Security and privacy

- Never track or install credentials, tokens, sessions, history, caches, logs,
  runtime databases, plugin state, or connector state.
- Do not require administrator privileges for normal installation.
- Keep destructive actions narrowly scoped and explicitly authorized.
- Test installers with temporary home and agent-configuration directories.
- Use synthetic fixtures.
- Give CI the minimum permissions required.
- Keep merge, deployment, installation, privileged actions, and apply
  human-controlled.

## Compatibility

- Linux is the initial installer target.
- Codex and Claude Code are the initial agent targets.
- Ubuntu 24.04, Debian 12, and Fedora 43 are the initial container baselines.
- Add an agent or platform only after its discovery, installation, and
  validation behavior is tested.
- Skills should remain agent-neutral where practical.

## Non-goals

- Mirroring an agent's complete home directory.
- Installing or authenticating coding agents, CodeRabbit, plugins, connectors,
  or local model servers.
- Managing general agent configuration, trust entries, or broad permissions in
  the first release.
- Replacing project-specific instructions or requirements.
- Managing Homelab, Nimbus, or Dotfiles implementation.
- Generating HTML for plans that are clearer as prose or a short list.
- Supporting untested platforms or agents.

## First-release acceptance criteria

- Shared global instructions install safely for Codex and Claude Code.
- Each agent adapter has an isolated discovery or installation test.
- All three initial skills pass structural and realistic workflow tests.
- `html-plan` produces a validated self-contained visualization.
- Installation is previewable, reversible, and idempotent.
- Interrupted installation rolls back completed target mutations.
- One command runs the same validation locally and in CI.
- Ubuntu, Debian, and Fedora validation images pass.
- No private runtime state is selected or tracked.
- One Homelab pull request completes the planned workflow.

## Unresolved decisions

There are no unresolved implementation decisions for the local first-release
artifact. Live required checks and optional remote CodeRabbit remain external
repository settings and must be confirmed after the first GitHub Actions run.
