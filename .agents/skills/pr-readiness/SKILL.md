---
name: pr-readiness
description: Determine whether a local change or pull request has complete, current evidence without publishing or merging it. Use when reviewing a diff, preparing a PR, checking merge readiness, running local CodeRabbit, inspecting CI or review feedback, or deciding what remains before a change can merge.
---

# Pull-request readiness

Treat readiness as evidence tied to the latest change, not as a general feeling.

## Establish scope

1. Read repository instructions and the current plan.
2. Inspect the branch, status, complete diff, staged changes, and untracked
   files.
3. Identify unrelated, accidental, generated, secret, or oversized changes.
4. Confirm the change matches one coherent outcome and its acceptance criteria.

Do not hide unrelated changes by resetting or deleting them. Report and
separate them safely.

## Validate locally

1. Run focused checks for the changed area.
2. Run the repository's complete local validation command.
3. Perform required manual tests in the stated environment.
4. Inspect the final diff after automated fixes.
5. Record exact commands and results.

Missing or unavailable required evidence is not a pass.

## Run independent AI review

When the CodeRabbit CLI is available and the repository permits it, run:

```sh
coderabbit review --agent --uncommitted --include-untracked
```

Evaluate findings against requirements and code. Fix valid findings, rerun
affected deterministic checks, and report rejected findings briefly. Do not
repeat AI review indefinitely; stop after the repository's configured pass
limit or two passes when no limit exists.

If CodeRabbit is unavailable, unauthenticated, or fails, record that exact
state. Do not install or authenticate it implicitly.

## Inspect pull-request state

Only when a pull request exists:

1. Identify the latest pull-request commit.
2. Verify required CI checks belong to that commit and have completed.
3. Inspect review decisions, inline comments, and unresolved threads.
4. Distinguish actionable feedback from stale, resolved, or informational
   comments.
5. Confirm required screenshots, logs, rollout, accessibility, or target
   environment evidence.

Failed, pending, missing, or stale required checks block readiness.

## Report

Return:

- scope reviewed
- focused and full validation
- manual evidence
- local AI-review status
- CI status for the latest commit
- unresolved actionable feedback
- limitations and residual risk
- one verdict: `ready`, `not ready`, or `ready except for explicit human action`

Do not commit, push, create a pull request, resolve threads, merge, deploy, or
apply infrastructure unless the user separately authorizes that action.
