# Development workflow

## Document roles

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Durable repository working instructions |
| `CLAUDE.md` | Thin Claude Code route to canonical instructions |
| `SPEC.md` | Requirements, boundaries, non-goals, and acceptance criteria |
| `ROADMAP.md` | Ordered outcomes, risks, and exit criteria |
| `TASKS.md` | Current phase work and validated status |
| `docs/IMPLEMENTATION.md` | Component purpose, design, boundaries, and validation |
| `docs/INSTALLATION.md` | Installation, manifest, recovery, and uninstall |
| `docs/AGENT-PATHS.md` | Verified agent instruction and skill locations |
| `docs/SKILLS.md` | Canonical skill inventory and boundaries |
| `docs/GITHUB.md` | Pull-request checks and external repository settings |
| `docs/` | Reference material loaded only when requested or routed |

## Multi-agent model

- Keep shared behavior and skill bodies agent-neutral.
- Keep one canonical source for each rule or workflow.
- Use thin adapters for required instruction names, discovery paths, or
  tool-specific behavior.
- Test every supported agent separately.
- Do not assume that an agent recursively reads `docs/`.

Initial targets:

- Codex
- Claude Code

Installed user locations and source references are documented in
`docs/AGENT-PATHS.md`.

## Lifecycle

1. Read repository instructions and relevant planning documents.
2. Inspect the branch, worktree, architecture, and existing validation.
3. Define or confirm observable requirements and non-goals.
4. Select one roadmap outcome.
5. Break the current phase into reviewable tasks.
6. Define automated checks, manual checks, rollback, and stop points.
7. Stop if the user requested planning only.
8. Implement one authorized phase or coherent change.
9. Run focused checks and inspect the diff.
10. Run the complete local gate.
11. Run local CodeRabbit when available.
12. Fix valid findings and rerun affected checks.
13. Commit, push, or open a draft PR only when authorized.
14. Verify CI and reviews against the latest commit.
15. Resolve actionable review threads.
16. Complete required manual testing.
17. Merge only after all required evidence is current.
18. Update roadmap evidence and replace active tasks when a phase completes.

## Pull-request evidence

Record:

- problem and approach
- included scope and non-goals
- important decisions or deviations
- exact automated checks
- manual tests and environment
- screenshots for visible changes
- skipped validation
- limitations and residual risk
- follow-up work

## Authorization boundaries

Planning does not authorize implementation.

Implementation does not automatically authorize:

- commit
- push
- PR creation
- merge
- installation
- deployment
- privileged action
- infrastructure apply

Keep each boundary explicit.

## Validation layers

- Focused checks during iteration
- One canonical full local gate
- CI against the latest pull-request commit
- Independent semantic review
- Manual target testing for behavior automation cannot prove

Report unavailable or skipped checks. Never convert missing evidence into a
passing result.

The canonical deterministic gate is:

```sh
./scripts/validate.sh
```

Use `./scripts/validate.sh --containers` when local Docker or Podman is
available and the full distribution matrix is required.
