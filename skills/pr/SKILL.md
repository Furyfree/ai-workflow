---
name: pr
description: Open, merge, or follow up a pull request. Use only when the user asks for it - "make a PR", "open a pull request", "merge it straight in", "lav en PR", "opret en PR", "åbn en PR", "bare ind i main", "check the PR", "check the PRs", "tjek PR'en", "tjek PR'erne", "the PR is ready", "PR'en er klar", "what did the review say". Not for a plain commit or push (use commit).
---

# Pull request

A PR goes one of two ways. Merge now: merged into the default branch at once,
and Greptile reviews it afterwards. Review first: a draft that Greptile
reviews before the merge.

Follow-up ("check the PR", "what did the review say"): read the PR and its
description with `gh pr view`, its conversation with `gh pr view --comments`,
its checks with `gh pr checks`, and its line comments with
`gh api repos/{owner}/{repo}/pulls/<number>/comments`. If the
Greptile Review check is still running, say so and hand back; otherwise go
to step 5. "Check the PRs": the same for every PR updated in the last two
days (`gh pr list --state all --limit 100 --search "updated:>=<date>"`),
listing only findings neither fixed nor answered. Never create anything. "The PR is
ready": run `gh pr ready`, then hand back.

Ask each question, and each wait for go, with the agent's question prompt
(AskUserQuestion in Claude Code), not in chat; use chat only without one.

1. Look at what is uncommitted and unpushed. Ask one question that names the
   repository, branch and PR title. The answer is the go for branch, commit,
   push and PR, and with Merge now also for the merge.
   - Merge now: Recommended when the change is small and tested where it runs
   - Review first: Recommended when it is large, risky, or untested
   - Wait: nothing happens
2. Run the checks the repository's AGENTS.md names. If one fails, stop and
   show the error.
3. Branch, commit, push. Body: what changed and how to test it, five lines
   at most. A signing or push error: follow the 1Password note in the
   [commit skill](../commit/SKILL.md).
   - Merge now: `gh pr create`, not as a draft, since GitHub will not merge
     one. Merge as in step 6; if GitHub refuses until checks pass, say so
     and hand back. On the default branch, `git fetch` and
     `git merge --ff-only @{u}`. End with "Greptile reviews #N in a few
     minutes; say 'check the PR' for its findings", and repeat that line at
     the end of later replies in this chat until the PR is checked or the
     user skips it.
   - Review first: `gh pr create --draft`, then step 4.
4. Ask one question - ready for review? Greptile reviews a PR once it is no
   longer a draft and again on every push; each review costs money.
   - Keep as draft: more work is coming
   - Ready: `gh pr ready`, then hand back (Recommended)
   - `validate` skill first, then `gh pr ready` once its findings are settled
5. Findings: one numbered list with a recommendation per item. The user's
   answer by number covers the fix, its commit, and the push to the PR
   branch. Put a round's fixes in one commit and one push; before longer
   work, run `gh pr ready --undo`. Leave fixed Greptile comments alone; it
   resolves them on its next review. Reply to a rejected one in one line
   saying why: `gh api repos/{owner}/{repo}/pulls/<number>/comments/<id>/replies -f body=...`.
   No second review unless asked. On a merged PR, the fixes go in a new PR
   from step 1, and each fixed comment gets a one-line reply linking it.
6. Merge method. Repositories owned by Furyfree or byrne-homelab, unless
   their AGENTS.md says otherwise: `gh pr merge <number> --rebase
   --delete-branch`. Others: the method their recent merged PRs show in
   `git log`: "Merge pull request" commits mean `--merge`, one commit ending
   in `(#N)` per PR means `--squash`, otherwise `--rebase`. Review first:
   when CI is green, say so and give the merge command; merge and clean up
   branches only when asked.
