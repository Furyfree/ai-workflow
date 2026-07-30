---
name: ai-project-manager
description: Inspect, create, or reconcile repository planning documents and turn an accepted roadmap outcome into one bounded phase. Use for new repository foundations, AGENTS.md/SPEC.md/ROADMAP.md/TASKS.md setup, plan reviews, conflicting project documents, phase selection, or planning-only requests that must stop before implementation.
---

# AI Project Manager

Build a reliable project picture before proposing work. Preserve existing
requirements and stop at the authorization boundary.

## Inspect

1. Read applicable repository instructions.
2. Inspect the branch, worktree, tracked and untracked changes, repository
   layout, validation entry points, and relevant project documents.
3. Identify the current source of truth for requirements, sequencing, and
   active work.
4. Report conflicts, missing decisions, unstated risks, and ambiguous scope.

Do not create the four-document structure automatically when an existing
project has another clear planning system. Reconcile first.

## Create or reconcile project documents

When the user requests this structure, use the templates under
`assets/project/`:

- `AGENTS.md`: durable repository working rules
- `CLAUDE.md`: thin Claude Code route to `AGENTS.md`
- `SPEC.md`: requirements, boundaries, non-goals, and acceptance criteria
- `ROADMAP.md`: ordered outcomes and exit criteria
- `TASKS.md`: current phase tasks and validation state

Replace template markers with project facts. Remove unused sections. Never
leave generic filler or overwrite existing documents silently.

Keep each fact in one canonical place:

- working behavior in `AGENTS.md`
- accepted product behavior in `SPEC.md`
- phase order in `ROADMAP.md`
- current execution state in `TASKS.md`

## Plan one phase

1. Select one accepted roadmap outcome.
2. Define observable acceptance criteria.
3. List implementation tasks in dependency order.
4. Define focused checks, the full local gate, and manual validation.
5. Define rollback or recovery for stateful changes.
6. Identify decisions or permissions needed before work can continue.
7. State where the work must pause.

Prefer a phase that produces one coherent, reviewable pull request.

## Stop correctly

- If the user asked for analysis or planning, stop before implementation.
- Do not mark a task complete until its required evidence exists.
- Do not infer permission to commit, push, open a pull request, merge, install,
  deploy, or apply infrastructure.

## Output

Summarize:

- current state
- conflicts or missing decisions
- documents created or changed
- selected phase and acceptance criteria
- validation and rollback
- explicit next authorization boundary
