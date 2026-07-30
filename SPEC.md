# AI workflow specification

## Purpose

Provide a small shared workflow for a developer who uses Codex and Claude Code
across multiple repositories.

## Required behavior

- Store shared coding-agent behavior once.
- Keep shared guidance concise and bias changes toward existing project
  patterns, proportional scope, and removal of generated bloat.
- Link the same global instructions into the supported Codex and Claude Code
  locations.
- Install a small Codex-only rules file for low-risk inspection and validation
  commands.
- Install the five canonical skills for either or both agents.
- Provide adaptable project templates without overwriting existing documents.
- Preview installation without changing agent homes.
- Back up conflicting targets before replacing them.
- Support safe repeated symlink installation and uninstall.
- Run one deterministic local validation command in CI.
- Keep external state changes behind explicit user intent.
- Provide trusted repository-local Codex rules for read-only branch and
  pull-request inspection without changing live Codex configuration.

## Components

- `global/`: shared global instructions
- `codex/`: narrow Codex-specific command rules
- `.codex/`: repository-local branch and pull-request inspection rules
- `.agents/skills/`: canonical skills and project templates
- `scripts/`: symlink installation, uninstall, tests, and validation
- `.github/`: pull-request evidence and CI
- `README.md`: installation, recovery, validation, and public usage

## Skills

### `ai-project-manager`

Inspects and reconciles repository planning documents, then produces one
bounded phase with acceptance criteria, validation, recovery, and a clear stop
point. It plans; implementation requires a separate user request.

### `pr-readiness`

Inspects the complete change and reports whether local validation, manual
evidence, CI, and review state are current. When a local CodeRabbit review
runs, actionable findings block pull-request creation or update. The skill
reports each problem and proposed fix and waits for user direction. Missing or
unavailable CodeRabbit is reported as unavailable evidence but does not block
publication. The skill does not publish or merge.

### `html-plan`

Creates a self-contained visual explanation when a broad plan or comparison is
materially clearer as HTML. Markdown remains canonical.

### `subagent`

Delegates one bounded, independent, read-only task through the current agent or
an explicitly selected Codex, Claude, or Grok provider. External runs select
the latest stable provider flagship at high reasoning, avoid interactive
permission prompts without removing the read-only boundary, and stop for user
direction when access or model availability fails. Concrete model IDs are
verified current defaults rather than permanent pins. The main agent verifies
the result.

### `passthrough`

Audits and tightens a repository as a whole. It supports a main-agent pass,
exactly one optional provider-selected subagent pass before or after the main
pass, and an explicit loop mode limited to three sequential subagent passes
with early stopping.

## Installation

- Linux and Bash are the first supported platform.
- Symlinks are the only first-release installation mode.
- Codex and Claude Code may be selected independently.
- Codex installation links `codex/rules/ai-workflow.rules` without replacing
  other rule files.
- Conflicts receive timestamped backups.
- Each agent has a small manifest used for safe updates and uninstall.
- Codex rules allow only documented low-risk inspection and validation
  prefixes. They do not allow generic shells, privilege escalation, publishing,
  remote administration, package installation, or infrastructure changes.
- Trusted project-local Codex rules reduce prompts for read-only branch and
  pull-request inspection. Git and pull-request mutations remain unmatched;
  commit, push, opening or updating a pull request, merge, installation,
  deployment, privileged actions, and infrastructure apply each require an
  explicit user request.
- Installation never modifies credentials, sessions, plugins, trust, sandbox
  or approval settings, permission profiles, `config.toml`, models, hooks, or
  connector state.

## Non-goals

- Mirroring complete agent configuration directories
- Copy installation
- Cross-platform installers
- Automatic plugin, model, MCP, CodeRabbit, or Codex code-review setup
- Broad command allowlists or automatic trust and permission changes
- Managing project-specific requirements
- Simulating agent behavior in deterministic tests
- Browser automation or a general HTML framework
- Automatic merge, deployment, or infrastructure apply

## First-release acceptance criteria

- `./scripts/validate.sh` passes locally and in CI.
- Isolated tests prove dry-run, symlink installation, conflict backup, repeated
  installation, drift refusal, and uninstall for both agents and the Codex
  rules file.
- Codex policy checks allow the documented low-risk examples and leave
  mutation, network, publication, and generic shell commands unmatched.
- Project policy checks allow documented read-only branch and pull-request
  inspection and leave Git and pull-request mutations unmatched.
- The five skills have valid metadata and all referenced templates exist.
- Controlled user-level tests confirm Codex and Claude discover installed
  instructions and skills.
- One real repository change uses the workflow through human merge.
