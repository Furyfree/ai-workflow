---
name: ai-project-manager
description: Inspect repository foundations or planning documents and define one bounded phase. Use when the current request asks for repository onboarding, foundation setup, a plan review, document reconciliation, phase selection, or planning only.
---

# AI project manager

Build a reliable project picture without inventing requirements.

## Inspect

1. Find and follow applicable repository instructions, including `AGENTS.md`
   when present.
2. Inspect the branch, worktree, layout, validation, and relevant documents.
3. Identify the sources of truth for requirements, sequencing, and active work.
4. Report conflicts, missing decisions, risks, and ambiguous scope.

Do not impose a new document structure on a repository that already has a clear
planning system.

## Inspect repository foundations

When the user asks to set up, standardize, or review a new or existing
repository, include only the foundations relevant to that repository:

- repository instructions, ownership documents, validation, CI, and pull-request
  evidence
- supported coding agents, skill discovery, and project-specific review rules
- dependency updates, generated files, secrets, permissions, and recovery
- optional cloud execution and hosted Codex review when the user intends to use
  them

For Codex Cloud, determine whether the repository needs cloud tasks or hosted
GitHub review before recommending an environment. Treat connector access, the
per-repository cloud environment, and the code-review setting as separate
prerequisites. Prefer a minimal environment: no secrets without a demonstrated
need, agent internet access off unless the work requires it, and automatic
setup plus caching until the repository's validation proves that manual setup
is needed. Include a user-run check that the complete local gate also works in
the cloud environment.

Do not recommend cloud setup for every repository by default. Active
repositories that will use cloud tasks or hosted Codex review are good
candidates; archived, local-only, or sensitive repositories may not be.
Planning or describing an external setting does not authorize creating an
environment, granting connector access, changing review settings, or adding
secrets.

When hosted Codex review is selected, keep durable repository-specific review
expectations in a concise `## Code Review Rules` section in `AGENTS.md`. Treat
operational documentation as behavior when inaccurate commands, paths,
permissions, or recovery guidance could mislead users. Leave mechanical style
and formatting checks to deterministic validation.

## Create or reconcile documents

When the user requests this planning structure, adapt the templates under
`assets/project/`:

- `AGENTS.md`: durable working rules
- `SPEC.md`: accepted requirements and boundaries
- `ROADMAP.md`: ordered outcomes and exit criteria
- `TASKS.md`: current phase and validation state

Use the optional `CLAUDE.md` template only when the repository supports Claude
Code. Inspect and reuse an existing `README.md`; this skill does not provide a
generic README template. Remove unused sections and never overwrite existing
requirements silently.

Keep `ROADMAP.md` short. Order phases, use checkboxes for observable work, add
only constraints that affect sequencing, and retain compact completed
milestones when useful. Put current implementation detail in `TASKS.md` or the
phase plan.

When a roadmap phase needs substantial research, alternatives, or
version-sensitive notes, keep the phase summary in `ROADMAP.md` and link one
focused detail file such as `roadmap/<topic>.md`. Reuse an established planning
detail directory when the repository already has one. The detail file may own
research, sources, constraints, options, and unresolved decisions; it must not
duplicate the specification, roadmap order, or current task checklist. Do not
create a detail file for an ordinary phase that fits clearly in the roadmap.

When their shared contract changes, update `SPEC.md`, `ROADMAP.md`, and
`TASKS.md` together without mixing their ownership.

## Plan one phase

Define:

- one accepted outcome and observable acceptance criteria
- implementation tasks in dependency order
- focused checks, the complete local gate, and manual validation
- recovery for stateful changes, including disabling or removing optional
  external integrations
- unresolved decisions and required permissions
- the explicit stop point

In an interactive Codex session, the user may enter `/plan` to switch the
conversation into planning mode. That interface control does not replace this
skill's document reconciliation or its stop-before-implementation boundary.

Stop after the plan. Implementation requires a separate user request. Do not
infer permission to commit, push, publish, merge, install, deploy, or apply.

## Report

Summarize current state, conflicts, the selected phase, validation, recovery,
and the next authorization boundary.
