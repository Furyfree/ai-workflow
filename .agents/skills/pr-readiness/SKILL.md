---
name: pr-readiness
description: Determine whether a change has complete current pull-request evidence. Use when the current request asks to create or update a pull request, commit further work to an existing pull request, inspect its CI or feedback, or assess merge readiness.
---

# Pull-request readiness

Use this workflow for the current pull-request outcome only. Do not keep it
active for later unrelated edits merely because it was used earlier.

## Follow the pull-request lifecycle

For a full pull-request workflow, prefer this sequence:

1. Prepare and validate the change locally.
2. Create a draft pull request when publication is authorized.
3. Treat that explicit pull-request creation request as authorization for one
   standard hosted review trigger unless the user opts out or hosted review is
   unavailable. Confirm that the trigger was accepted, report the pending
   handoff, and end the turn. Do not wait for completion or poll the pull
   request.
4. When the user returns after that review completes, inspect and report every
   actionable finding, then wait for approval before editing.
5. After approved fixes, rerun validation, create one coherent fix commit, and
   update the branch only when those actions are authorized. Do not request
   another hosted review by default.
6. Wait for CI on the exact final head, verify every finding is resolved, and
   report whether the draft is ready to mark ready for review and merge.

Treat one deliberate hosted review as sufficient for a pull-request cycle.
Never infer a review trigger from a commit, push, or update to an existing pull
request. After the pull-request creation trigger, leave any additional hosted
review requests to the user. If the first review failed or became insufficient
because substantive new scope was added, report that evidence gap and use the
local-review fallback when appropriate.

Do not monitor hosted review in the background. The user owns the handoff back
to this workflow after GitHub reports that review is complete.

## Bound the review cycle

Use this review budget for one pull-request cycle:

- one hosted review
- one complete CodeRabbit review, plus at most one rerun after approved fixes
- at most one full `local-pr-review`, used only when explicitly requested or
  when no current full-severity review is available

Hosted review may remain useful evidence without covering ordinary-priority
findings. When CodeRabbit is unavailable or does not cover the current scope,
run the one local fallback even if hosted review is current.

If the local fallback reports actionable findings, wait for approval, apply the
approved fixes, rerun affected checks and the complete local gate, and inspect
the exact fix diff. Do not start another full local review. Substantive new
scope may justify a new review cycle, but explain the evidence gap and get user
direction before starting it.

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

After approved fixes from the first CodeRabbit review, rerun affected checks
and at most one new local CodeRabbit CLI review. If it still reports an
actionable finding, stop and report it again. After those findings are approved
and fixed, use targeted verification rather than a third CodeRabbit review.

When a local CodeRabbit CLI review runs, a pull request may be created or
updated only when that review completed without actionable findings.

## Inspect a pull request

When a pull request exists:

1. Identify the pull request's latest commit and current body.
2. Read conversation comments, submitted reviews, inline review comments, and
   unresolved threads, including requests from the user and other reviewers.
   Do not rely only on check summaries or the latest review decision.
3. Verify each apparent request against the current head and distinguish
   actionable feedback from informational, stale, duplicated, or invalid
   comments.
4. Identify the latest hosted review and the commit it reviewed. Use it as
   severity-limited independent review evidence when it covers the current
   scope.
5. If later commits contain only user-approved fixes for that review, verify
   the fix diff and each finding directly. Do not require or request another
   hosted review merely because those fixes changed the head.
6. If no current full-severity review is available, use the one
   `local-pr-review` fallback against the exact remote head even when hosted
   review is current. Keep its report local unless the user separately asks to
   post it. Do not duplicate a current CodeRabbit or other full-severity review.
7. Verify required CI belongs to the latest commit and has completed.
8. Confirm required screenshots, logs, rollout, or target-environment evidence.
9. Confirm any repository-required independent review is sufficient.

Unresolved actionable feedback and failed, pending, missing, or stale required
evidence block readiness. Report each actionable request and its proposed
disposition before editing or updating the pull request.

An explicit request to create a pull request includes one standard hosted-review
trigger unless the user opts out. A commit, push, or request to update an
existing pull request does not authorize another trigger. Never put a live
agent invocation in the pull-request title or body; post the one trigger as its
own comment and leave any later triggers to the user.

Marking a draft ready for review and merging are separate external actions.
Ask before either action. If the repository may automatically start hosted
review when a draft becomes ready, tell the user and do not add another manual
review invocation at that transition.

## Hand off post-merge cleanup

When the final head has current CI, the review budget is complete, and only the
user's merge remains, include an `After GitHub reports merged` command block
using the pull request's resolved base and head branches:

```sh
git switch <base-branch>
git pull --ff-only origin <base-branch>
git branch -d <head-branch>
git fetch --prune origin
```

Do not present these commands as safe to run before the merge. Keep branch
deletion before pruning so the remote-tracking branch can still prove the
topic branch safe to delete after a squash merge. If `git branch -d` refuses,
stop and inspect the merge and branch state; do not substitute `-D`
automatically. Deleting a surviving remote branch requires separate explicit
authorization.

Run the cleanup only when the user explicitly asks the agent to do it. Before
running, confirm the pull request is merged, the worktree is clean, and the
resolved branches match the current repository.

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
