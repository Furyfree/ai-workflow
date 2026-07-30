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

## Plan coherent commits

When the intended change contains independent reviewable outcomes, propose an
ordered multi-commit plan before any requested commit. Keep implementation,
tests, and contract documentation together when separating them would make a
commit incomplete. Do not split mechanically by file, directory, or line
count.

Each proposed commit should have one clear purpose, a fitting message, and an
independently understandable diff. A single coherent outcome should remain one
commit. This skill proposes the plan but does not stage or commit it.

## Validate

1. Run focused checks.
2. Run the repository's complete local gate.
3. Perform required manual tests.
4. Inspect the final complete change.
5. Run `git status --short`, `git diff --check`, and
   `git diff --cached --check`.
6. Record exact commands, results, skipped checks, and residual risk.

When CodeRabbit is installed, check authentication once:

```sh
coderabbit auth status --agent
```

If CodeRabbit is missing or authentication is unavailable, tell the user and
continue every other readiness check. Record it as unavailable or skipped
evidence in the final bullet summary; it does not block publication by itself.
Do not install it or start login implicitly.

If CodeRabbit reports free-tier exhaustion or a usage rate limit, treat the
review as unavailable immediately. Do not wait for the allowance to reset,
enable usage billing, or consume paid credits implicitly. Continue the other
checks and report the limit as unavailable evidence.

When authenticated and permitted, choose the review scope that exactly matches
the tracked change being evaluated:

- For a branch or pull request, resolve its current base branch and review the
  complete branch change:

```sh
coderabbit review --agent --base <base-branch>
```

- Use `--committed` only when the intended scope is committed changes alone.
- Use `--uncommitted` only when the intended scope is staged and tracked
  working-tree changes alone.

Do not use a narrower mode as publication evidence. Record the selected base
or mode in the readiness report.

CodeRabbit can take several minutes and may be quiet between status updates.
Wait for the review process to complete before deciding readiness or
publishing. A heartbeat, partial finding list, or temporary lack of output is
not completion.

Do not send untracked files to an external reviewer by default. Report that
they were excluded. Include them only after the user explicitly approves the
exact path list and inspection confirms it contains no secrets, credentials,
private runtime state, or unrelated files.

If the review reports an actionable finding:

1. Mark the change `not ready`.
2. Do not fix it, commit, push, create a pull request, or update an existing
   pull request unless the user explicitly asks for those next actions.
3. List each problem, its location and evidence, the smallest proposed fix,
   and the checks that should be rerun.
4. Wait for the user to approve the fixes and explicitly request any
   publication action.

After approved fixes, rerun affected checks and one new CodeRabbit review. If
it still reports an actionable finding, stop and report it again. Do not turn
this into an automatic fix-and-review loop.

When a local CodeRabbit review runs, a pull request may be created or updated
only when that review completed without actionable findings.

## Inspect a pull request

When a pull request exists:

1. Use `local-pr-review` against the exact current remote head. Keep its report
   local unless the user separately asks to post it.
2. Identify the pull request's latest commit and current body.
3. Read conversation comments, submitted reviews, inline review comments, and
   unresolved threads, including requests from the user and other reviewers.
   Do not rely only on check summaries or the latest review decision.
4. Verify each apparent request against the current head and distinguish
   actionable feedback from informational, stale, duplicated, or invalid
   comments.
5. Verify required CI belongs to the latest commit and has completed.
6. Confirm required screenshots, logs, rollout, or target-environment evidence.
7. Confirm any repository-required independent review is current.

Unresolved actionable feedback and failed, pending, missing, or stale required
evidence block readiness. Report each actionable request and its proposed
disposition before editing or updating the pull request.

In Codex, `/review` is a useful user-run independent local review and `/diff`
shows the exact working-tree change. Neither replaces the pull-request
conversation, remote-head, or CI inspection above.

## Report

Return the reviewed scope, local checks, manual evidence, review state, current
CI, proposed commit plan, unresolved feedback, residual risk, and one verdict:
`ready`, `not ready`, or `ready except for explicit human action`. When a pull
request exists, include its number and URL. Describe the problem and
disposition for each actionable review finding; do not report only a finding
count.

Do not commit, push, create a pull request, resolve threads, merge, deploy, or
apply unless the user separately authorizes that action.
