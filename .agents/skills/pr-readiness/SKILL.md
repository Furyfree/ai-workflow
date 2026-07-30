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

If CodeRabbit is missing or authentication is unavailable, tell the user and
continue every other readiness check. Record it as unavailable or skipped
evidence in the final bullet summary; it does not block publication by itself.
Do not install it or start login implicitly.

When authenticated and permitted, run one review of the exact tracked change
intended for publication:

```sh
coderabbit review --agent --uncommitted
```

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

1. Identify its latest commit.
2. Verify required CI belongs to that commit and has completed.
3. Inspect review decisions, actionable comments, and unresolved threads.
4. Confirm required screenshots, logs, rollout, or target-environment evidence.
5. Confirm any repository-required independent review is current.

Failed, pending, missing, or stale required evidence blocks readiness.

## Report

Return the reviewed scope, local checks, manual evidence, review state, current
CI, unresolved feedback, residual risk, and one verdict: `ready`, `not ready`,
or `ready except for explicit human action`. When a pull request exists,
include its number and URL. Describe the problem and disposition for each
actionable review finding; do not report only a finding count.

Do not commit, push, create a pull request, resolve threads, merge, deploy, or
apply unless the user separately authorizes that action.
