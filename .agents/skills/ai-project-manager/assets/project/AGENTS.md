# Repository instructions

## Purpose

Describe what `{{PROJECT_NAME}}` owns and the user outcome it supports.

## Working rules

- Before editing, confirm the branch is based on the current default branch,
  is not the default branch, has a short task-specific name, and still exists
  upstream when it tracks a remote branch.
- Preserve unrelated changes.
- Edit only requested paths.
- Keep one coherent outcome per change.
- Follow the repository's existing architecture and naming.
- Do not report completion before required validation passes.
- Require an explicit user request for each commit, push, pull-request
  creation or update, merge, installation, deployment, privileged action, and
  infrastructure apply.
- When hosted review is configured, treat an explicit pull-request creation
  request as authorization for one standard review trigger unless the user opts
  out. Do not infer another trigger from later commits, pushes, or updates.

## Repository map

Document the important paths and what belongs in each one.

## Validation

List exact focused checks, the complete local gate, and required manual tests.

## Safety

Document secrets, generated files, destructive operations, external systems,
and actions that require explicit authorization.

## Documentation

- `SPEC.md` owns accepted requirements and boundaries.
- `ROADMAP.md` owns phase order and exit criteria.
- `TASKS.md` owns current work and validation state.

## Code Review Rules

### Documentation contracts

- Review changed documentation and instructions as first-class behavior. Flag
  claims, commands, paths, authorization boundaries, or recovery guidance that
  contradict the implementation or would materially mislead a user.
- Leave spelling, formatting, and other deterministic documentation checks to
  local validation unless they change meaning.
