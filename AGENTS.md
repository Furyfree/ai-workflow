# Repository instructions

## Scope

This repository is the source of truth for Patrick's portable coding-agent
instructions, reusable skills, agent adapters, installer, and workflow.

The shared workflow should remain agent-neutral. Codex and Claude Code are the
first supported clients; tool-specific behavior belongs in thin adapters.

## Operating principles

- Verify behavior before reporting completion.
- Never fabricate files, commands, output, tests, commits, or review state.
- Inspect relevant files and existing changes before editing.
- Preserve unrelated user changes.
- Keep changes narrow and communication direct.
- Do not add speculative features or abstractions.
- Stop at user approval boundaries.

## Before editing

- Inspect the current branch and worktree.
- Read the documents relevant to the request.
- Surface conflicts between requirements, roadmap, tasks, and implementation.
- State validation and stop points before non-trivial work.
- Match the repository's current naming and layout.

## Repository boundaries

- Keep shared behavior in canonical files.
- Keep agent-specific files small and limited to routing or required
  differences.
- Store reusable skills under `.agents/skills/<name>/SKILL.md`.
- Keep project-specific commands and requirements out of global instructions.
- Treat generated HTML plans as derived views, not sources of truth.
- Do not track credentials, tokens, sessions, history, caches, logs, runtime
  databases, or connector state.
- Do not manage broad trust, sandbox, or approval settings without a separate
  accepted requirement.
- Do not install or authenticate agents, CodeRabbit, plugins, or external
  services as hidden workflow behavior.

## Documentation routing

Read only what the task needs:

- `SPEC.md` for requirements, boundaries, and acceptance criteria.
- `ROADMAP.md` for phase order, risks, and exit criteria.
- `TASKS.md` for current work and validation status.
- `docs/WORKFLOW.md` for document ownership and the development lifecycle.
- `docs/IMPLEMENTATION.md` for component purpose, design, boundaries, and
  validation.
- `docs/DECISIONS.md` for accepted choices and unresolved design decisions.
- `docs/INSTALLATION.md` for install, manifest, recovery, and uninstall.
- `docs/AGENT-PATHS.md` for verified Codex and Claude discovery paths.
- `docs/SKILLS.md` before adding or changing reusable skills.
- `docs/GITHUB.md` for pull-request checks and external repository settings.
- A skill's `SKILL.md` before changing that skill.

Arbitrary files under `docs/` are references and are not loaded automatically.

## Editing

- Use plain Markdown and simple ASCII punctuation.
- Keep each document in its assigned role.
- Remove irrelevant template sections instead of leaving placeholders.
- Prefer instructions over scripts unless deterministic automation is needed.
- Add scripts or assets to a skill only when repeated use justifies them.
- Update requirements, roadmap, tasks, and implementation together when their
  shared contract changes.
- Do not mark tasks complete before their validation passes.

## Validation

Until the repository validation script exists:

- run `git diff --check`
- inspect `git status --short`
- inspect the complete diff
- verify local Markdown links
- report checks that could not run

After `scripts/validate.sh` exists, run it after changes to instructions,
skills, templates, adapters, installation, or repository layout.

## Git and pull requests

- Use short-lived branches for normal changes.
- Keep one coherent outcome per pull request.
- Run focused checks, then the full local gate.
- Record exact automated and manual evidence.
- Commit, push, open a PR, merge, deploy, or install only when authorized.
- Never report merge readiness with failed, pending, missing, or stale required
  checks or unresolved actionable review feedback.

## Current phase

The first-release implementation exists locally. Keep commit, push,
pull-request creation, merge, installation into real agent homes, and GitHub
settings changes behind separate user authorization.
