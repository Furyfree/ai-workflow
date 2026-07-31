---
name: local-pr-review
description: Review a GitHub pull request from an authenticated local checkout. Use when the current request explicitly asks for local review or when pull-request readiness needs one full-severity fallback.
---

# Local pull-request review

Use the local checkout and `gh` authentication. Do not depend on Codex Cloud, a
local CodeRabbit CLI review, or another review provider.

Do not run this workflow merely to duplicate a current full-severity review.
Hosted Codex severity-limited review does not replace this fallback. When
invoked by `pr-readiness`, run it at most once per pull-request cycle. An
explicit request for another local review overrides that limit.

## Keep review and publication separate

- "Review this pull request" authorizes inspection and a local report only.
- Post to GitHub only when the user explicitly asks to post, comment, or submit
  the review.
- A posted comment appears as the account reported by `gh auth status`, not as
  an official Codex bot. State that clearly.
- Do not fix findings, commit, push, resolve threads, approve, request changes,
  or merge unless the user separately asks for that action.

## Use Codex review controls

In an interactive Codex session, the user may run `/review` to review a base
branch, commit, or uncommitted change and `/diff` to inspect the exact local
change. For a non-interactive base-branch review, use:

```sh
codex review --base <base-branch>
```

These controls review local Git state; they do not identify the current pull
request, read its discussion, or publish feedback. Treat their output as one
review input and complete the pull-request inspection below. Slash commands are
user interface controls, so do not claim that the skill invoked one itself.

## Inspect

1. Read repository instructions and review rules.
2. Run `gh auth status` and identify the repository and pull request. Stop if
   the authenticated account cannot read the pull request.
3. Record the pull request number, URL, base branch, head branch, and head SHA.
4. Read the title, body, commits, checks, conversation comments, submitted
   reviews, inline comments, and unresolved threads. Avoid repeating feedback
   that is already present or fixed.
5. Review the complete remote pull-request diff. Use surrounding source,
   tests, and documentation when needed to prove a finding. Do not include
   uncommitted local changes unless the user explicitly asks to review them.
6. Before reporting or posting, confirm the remote head SHA has not changed.
   Re-review changed material if it has.

Report only concrete correctness, security, regression, compatibility, or
missing-validation problems introduced by the pull request. Skip style
preferences, speculative concerns, and mechanical issues already enforced by
current checks.

## Report locally

Return:

- pull request number, URL, and reviewed head SHA
- findings ordered by severity, with path and line, evidence, impact, and the
  smallest reasonable fix
- relevant existing feedback and whether it is current, stale, or resolved
- checks or evidence inspected
- an explicit statement when no actionable findings were found

## Post one comment

Only after explicit publication authorization:

1. Reconfirm `gh auth status`, the pull request URL, and the unchanged head SHA.
2. Prepare one concise Markdown comment headed `Local agent review`. Include the
   reviewed SHA and all actionable findings, or state that none were found.
3. Check that the comment contains no credentials, private runtime state, or
   unrelated local information.
4. Publish it with `gh pr comment <number> --body-file <temporary-file>`.
5. Return the comment URL and identify the GitHub account that posted it.

If posting fails, preserve the local review, report the exact error, and do not
change authentication, connector, repository, or account settings implicitly.
