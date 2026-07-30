---
name: ai-project-manager
description: Inspect or reconcile repository planning documents and define one bounded phase. Use for repository foundations, plan reviews, conflicting project documents, phase selection, or planning-only requests.
---

# AI project manager

Build a reliable project picture without inventing requirements.

## Inspect

1. Read applicable repository instructions.
2. Inspect the branch, worktree, layout, validation, and relevant documents.
3. Identify the sources of truth for requirements, sequencing, and active work.
4. Report conflicts, missing decisions, risks, and ambiguous scope.

Do not impose a new document structure on a repository that already has a clear
planning system.

## Create or reconcile documents

When the user requests this planning structure, adapt the templates under
`assets/project/`:

- `AGENTS.md`: durable working rules
- `README.md`: installation, recovery, validation, and public overview
- `SPEC.md`: accepted requirements and boundaries
- `ROADMAP.md`: ordered outcomes and exit criteria
- `TASKS.md`: current phase and validation state

Use the optional `CLAUDE.md` template only when the repository supports Claude
Code. Remove unused sections and never overwrite existing requirements
silently.

Keep `ROADMAP.md` short. Order phases, use checkboxes for observable work, add
only constraints that affect sequencing, and retain compact completed
milestones when useful. Put current implementation detail in `TASKS.md` or the
phase plan.

When their shared contract changes, update `SPEC.md`, `ROADMAP.md`, and
`TASKS.md` together without mixing their ownership.

## Plan one phase

Define:

- one accepted outcome and observable acceptance criteria
- implementation tasks in dependency order
- focused checks, the complete local gate, and manual validation
- recovery for stateful changes
- unresolved decisions and required permissions
- the explicit stop point

Stop after the plan. Implementation requires a separate user request. Do not
infer permission to commit, push, publish, merge, install, deploy, or apply.

## Report

Summarize current state, conflicts, the selected phase, validation, recovery,
and the next authorization boundary.
