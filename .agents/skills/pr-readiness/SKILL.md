---
name: pr-readiness
description: Determine whether a local change or pull request has complete current evidence. Use for diff review, pull-request preparation, CI and review inspection, or merge-readiness checks.
---

# Pull-request readiness

## Inspect scope

1. Read repository instructions, requirements, and the accepted plan.
2. Inspect the branch, status, staged and unstaged changes, and untracked files.
3. Identify unrelated, accidental, generated, secret, or oversized changes.
4. Confirm the change matches one coherent outcome.

## Validate

1. Run focused checks.
2. Run the repository's complete local gate.
3. Perform required manual tests.
4. Inspect the final complete change.
5. Run `git status --short` and `git diff --check`.
6. Record exact commands, results, skipped checks, and residual risk.

When CodeRabbit is installed, check authentication once:

```sh
coderabbit auth status --agent
```

If it reports that authentication is unavailable, tell the user, skip only the
CodeRabbit review, and continue every other readiness check. Do not start login
or install it implicitly.

When authenticated and permitted, run one review:

```sh
coderabbit review --agent --uncommitted --include-untracked
```

Fix valid findings and rerun affected checks. Do not start a CodeRabbit review
loop unless the user explicitly requests one.

## Inspect a pull request

When a pull request exists:

1. Identify its latest commit.
2. Verify required CI belongs to that commit and has completed.
3. Inspect review decisions, actionable comments, and unresolved threads.
4. Confirm required screenshots, logs, rollout, or target-environment evidence.
5. Confirm any repository-required independent review is current.

Failed, pending, missing, or stale required evidence blocks readiness.

## Report

Return the reviewed scope, local checks, manual evidence, review state, current
CI, unresolved feedback, residual risk, and one verdict: `ready`, `not ready`,
or `ready except for explicit human action`.

Do not commit, push, create a pull request, resolve threads, merge, deploy, or
apply unless the user separately authorizes that action.
