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
- Install the six canonical skills for either or both agents.
- Provide adaptable project templates without overwriting existing documents.
- Keep roadmap order concise while allowing one linked detail file for a
  research-heavy phase.
- Preview installation without changing agent homes.
- Back up conflicting targets before replacing them.
- Support safe repeated symlink installation and uninstall.
- Run one deterministic local validation command in CI.
- Keep external state changes behind explicit user intent.
- Include read-only branch and pull-request inspection in the canonical global
  Codex rules without changing live Codex configuration.
- Keep the repository-local rule copy only as a bootstrap until the global
  symlink has been installed and proven.

## Components

- `global/`: shared global instructions
- `codex/`: narrow Codex-specific command rules
- `.codex/`: temporary bootstrap rules pending controlled global discovery
- `.agents/skills/`: canonical skills and project templates
- `roadmap/`: optional research and decisions for linked complex phases
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
evidence, CI, review state, and a coherent commit plan are current. For an
existing pull request it uses `local-pr-review` against the exact remote head.
When a local CodeRabbit review runs, actionable findings block pull-request
creation or update. The skill reports each problem and proposed fix and waits
for user direction. Missing or unavailable CodeRabbit is reported as
unavailable evidence but does not block publication. The skill does not commit,
publish, or merge.

### `local-pr-review`

Reviews the exact remote pull-request head through the authenticated local
checkout. It reports findings locally by default and posts one clearly labelled
comment as the authenticated GitHub user only when explicitly requested. It
does not impersonate the hosted Codex reviewer or mutate the change.

### `html-plan`

Creates a self-contained visual explanation when a broad plan or comparison is
materially clearer as HTML. Markdown remains canonical.

### `subagent`

Identifies independent outcomes in a multi-task request, proposes dependency
aware grouping, and waits for the user's delegation choice before task work.
Native delegation inherits the current model unless the user selects a provider
or model. Audits remain read-only; approved implementation assignments may edit
non-overlapping scopes without publishing. The main agent reviews, refines,
integrates, and validates every result. Provider-specific external runs use the
latest stable flagship at high reasoning when no model is selected and stop
for user direction when access or model availability fails.

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
  prefixes, including read-only branch and pull-request inspection. They do not
  allow generic shells, privilege escalation, publishing, remote
  administration, package installation, or infrastructure changes.
- The temporary project-local copy provides the same branch and pull-request
  inspection before controlled global installation. It is removed after the
  installed global policy is proven.
- Git and pull-request mutations remain unmatched. Commit, push, opening or
  updating a pull request, merge, installation, deployment, privileged
  actions, and infrastructure apply each require an explicit user request.
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
- Detailed roadmap files for phases that fit clearly in `ROADMAP.md`

## First-release acceptance criteria

- `./scripts/validate.sh` passes locally and in CI.
- Isolated tests prove dry-run, symlink installation, conflict backup, repeated
  installation, drift refusal, and uninstall for both agents and the Codex
  rules file.
- Codex policy checks allow the documented low-risk examples and leave
  mutation, network, publication, and generic shell commands unmatched.
- Global policy checks allow documented read-only branch and pull-request
  inspection and leave Git and pull-request mutations unmatched. The temporary
  project policy passes the same checks until controlled discovery removes it.
- The six skills have valid metadata and all referenced templates exist.
- Controlled user-level tests confirm Codex and Claude discover installed
  instructions and skills.
- One real repository change uses the workflow through human merge.
