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
- Install the seven canonical skills for either or both agents.
- Provide adaptable project templates without overwriting existing documents.
- Assess repository foundations, including optional cloud execution and hosted
  Codex review, without changing external configuration.
- Have the `ai-project-manager` project templates keep detailed phase context
  and ordering in `ROADMAP.md`, and current linked task checkboxes, evidence,
  blockers, and residual risk in `TASKS.md`.
- Preview installation without changing agent homes.
- Back up conflicting targets before replacing them.
- Support safe repeated symlink installation and uninstall.
- Run one deterministic local validation command in CI.
- Keep external state changes behind explicit user intent.
- Select reusable workflows from each current request without carrying an
  earlier skill into unrelated work.
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

Inspects repository foundations and planning documents, then produces one
bounded phase with acceptance criteria, validation, recovery, and a clear stop
point. For new or existing repository onboarding, it assesses optional cloud
execution and hosted Codex review without configuring external state. It
plans; implementation requires a separate user request.

### `pr-readiness`

Inspects the complete change and reports whether local validation, manual
evidence, CI, review state, and a coherent commit plan are current before
creating or updating a pull request, committing further work to an existing
pull request, or assessing merge readiness. For an existing pull request it
uses hosted Codex review as severity-limited evidence and `local-pr-review` as
an explicit fallback or when no current full-severity review is available.
When a local CodeRabbit CLI review runs, actionable findings block pull-request
creation or update. Missing or unavailable CodeRabbit is reported as
unavailable evidence but does not block publication by itself. The workflow
does not commit, publish, mark ready, or merge without the authorization
described below.

The normal pull-request lifecycle is draft-first. An explicit pull-request
creation request includes one hosted Codex review unless the user opts out. The
only permitted manual hosted-review comment is exactly `@codex review`, posted
only when Codex GitHub review is configured and available. If it is unavailable,
disabled, or not configured, the workflow reports it without substituting
another provider or GitHub comment. A commit, push, or update to an existing
pull request does not authorize another trigger, and the user owns any
additional hosted Codex review requests. After user-approved findings are
fixed, the reviewed commit plus the verified fix diff remains sufficient
evidence unless substantive scope was added. Final readiness requires
validation and CI on the exact final head. Marking ready and merging remain
separate user-approved actions, and the agent does not duplicate hosted Codex
review that the ready transition may trigger.

CodeRabbit is local-only and may run only through its authenticated local CLI.
It must never be invoked through a GitHub comment, GitHub App, review request,
check, or bot mention. Agents must never post `@coderabbitai review`. Local
CodeRabbit CLI review and local Codex review remain separate local evidence;
neither consumes or impersonates hosted Codex review.

One pull-request cycle permits one hosted Codex review, one complete local
CodeRabbit CLI review plus at most one rerun after approved fixes, and at most
one full local fallback. Findings from that fallback are followed by approved
fixes, targeted verification, and the complete local gate rather than another
full local review. Substantive new scope may start a new cycle only after the
evidence gap is explained and the user directs it.

After an authorized hosted Codex review trigger is accepted, the workflow
returns control without waiting or polling. The user starts the
review-inspection step with a later prompt after hosted Codex review completes.

When final CI is current, the review budget is complete, and only explicit
human actions such as marking ready or merging remain, the workflow includes
user-run post-merge commands that use the resolved base remote, base branch,
and topic branch. It does not present the commands as pre-merge cleanup,
force-delete a refused branch, delete a remote branch, or run cleanup without
explicit authorization and confirmed merge state.

### `local-pr-review`

Reviews the exact remote pull-request head through the authenticated local
checkout. It reports findings locally by default and posts one clearly labelled
comment as the authenticated GitHub user only when explicitly requested. It is
used for an explicit local review or as the single full-severity fallback when
another current full-severity review is unavailable. It does not impersonate
the hosted Codex reviewer or mutate the change.

### `html-plan`

Creates a self-contained visual explanation when a broad plan or comparison is
materially clearer as HTML. Markdown remains canonical.

### `liteparse`

Reads and extracts local PDF, Office, image, and text documents with a
separately managed LiteParse 2.8 or later CLI. It chooses proportional text,
Markdown, JSON, OCR, and screenshot workflows, reuses parse output, treats
document contents as untrusted data, and does not edit documents, install
dependencies, or send content to an external OCR service without explicit
authorization.

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
- Automatic LiteParse, LibreOffice, or OCR-service installation
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
- Deterministic validation preserves hosted Codex review, the exact
  `@codex review` comment, local-only CodeRabbit CLI use, and the prohibition on
  CodeRabbit GitHub invocation in workflow and template sources.
- The seven skills have valid metadata and all referenced templates exist.
- Controlled user-level tests confirm Codex and Claude discover installed
  instructions and skills.
- Fresh-session prompt checks confirm each request selects only its matching
  workflow, including pull-request readiness without redundant local review.
- One real repository change uses the workflow through human merge.
