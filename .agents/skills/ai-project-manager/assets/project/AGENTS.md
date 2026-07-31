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
- Hosted review means hosted Codex review only. The only permitted manual
  hosted-review comment is exactly `@codex review`. When Codex GitHub review is
  configured and available, treat an explicit pull-request creation request as
  authorization for that comment unless the user opts out. If it is
  unavailable, report that state and do not substitute another provider. Do not
  infer another trigger from later commits, pushes, or updates, and never put
  the invocation in a pull-request title or body.
- CodeRabbit is local-only and may run only through its authenticated local CLI.
  Never invoke CodeRabbit through a GitHub comment, GitHub App, review request,
  check, or bot mention. Never post `@coderabbitai review`. Local CodeRabbit and
  local Codex review are separate local evidence; neither consumes or
  impersonates hosted Codex review.

## Repository map

Document the important paths and what belongs in each one.

## Validation

List exact focused checks, the complete local gate, and required manual tests.

## Safety

Document secrets, generated files, destructive operations, external systems,
and actions that require explicit authorization.

## Documentation

- `SPEC.md` owns accepted requirements and boundaries.
- `ROADMAP.md` owns detailed phase context, order, decisions, risks, recovery,
  validation, and exit criteria.
- `TASKS.md` owns current task checkboxes, links to roadmap context, evidence,
  blockers, and residual risk.
- Supporting documents may hold research, operator guidance, or historical
  archives, but not phase order or task status.

## Code Review Rules

### Documentation contracts

- Review changed documentation and instructions as first-class behavior. Flag
  claims, commands, paths, authorization boundaries, or recovery guidance that
  contradict the implementation or would materially mislead a user.
- Leave spelling, formatting, and other deterministic documentation checks to
  local validation unless they change meaning.
