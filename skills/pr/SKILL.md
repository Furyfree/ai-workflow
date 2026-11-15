---
name: pr
description: Open or follow up a pull request. Use only when the user asks for it - "make a PR", "open a pull request", "lav en PR", "opret en PR", "åbn en PR", "check the PR", "tjek PR'en", "the PR is ready", "PR'en er klar", "what did the review say". Never use because of a commit or push.
---

# Pull request

Follow-up ("check the PR", "what did the review say"): read the PR and its
description with `gh pr view`, its checks with `gh pr checks`, and its line
comments with `gh api repos/{owner}/{repo}/pulls/<number>/comments`. If the
Greptile Review check is still running, say so and hand back; otherwise go
to step 5. Never create anything. "The PR is ready": run `gh pr ready`, then
hand back.

Ask each question, and each wait for go, with the agent's question prompt
(AskUserQuestion in Claude Code), not in chat; use chat only without one.

1. Look at what is uncommitted and unpushed. Propose the branch name and PR
   title in one line. Wait for go.
2. Run the checks the repository's AGENTS.md names. If one fails, stop and
   show the error.
3. Branch, commit, push, `gh pr create --draft`. Body: what changed and how
   to test it, five lines at most. A signing or push error: follow the
   1Password note in the [commit skill](../commit/SKILL.md).
4. Ask one question - ready for review? Greptile reviews a PR once it is no
   longer a draft, and each review costs money.
   - Keep as draft: more work is coming
   - Ready: `gh pr ready`, then hand back (Recommended)
   - `validate` skill first, then `gh pr ready` once its findings are settled
5. Findings: one numbered list with a recommendation per item. The user's
   answer by number covers the fix, its commit, and the push to the PR
   branch. No second review unless asked.
6. When CI is green, say so and give the merge command. Merge and branch
   cleanup only when asked.
