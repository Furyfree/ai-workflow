---
name: pr
description: Open or follow up a pull request. Use only when the user asks for it - "make a PR", "open a pull request", "lav en PR", "opret en PR", "åbn en PR", "check the PR", "tjek PR'en", "what did the review say". Never use because of a commit or push.
---

# Pull request

Follow-up ("check the PR", "what did the review say"): read the PR's
comments and CI with `gh pr view`, then go to step 5. Never create anything.

1. Look at what is uncommitted and unpushed. Propose the branch name and PR
   title in one line. Wait for go.
2. Run the checks the repository's AGENTS.md names. If one fails, stop and
   show the error.
3. Branch, commit, push, `gh pr create`. Body: what changed and how to test
   it, five lines at most.
4. Ask one question - which review?
   - None
   - `validate` skill: local, other models (Recommended)
   - CodeRabbit CLI: `coderabbit review --agent --base <base-branch>`
   - Hosted Codex: comment exactly `@codex review`, then hand back to the user
   Run only the one picked, once.
5. Findings: one numbered list with a recommendation per item. The user's
   answer by number covers the fix, its commit, and the push to the PR
   branch. No second review unless asked.
6. When CI is green, say so and give the merge command. Merge and branch
   cleanup only when asked.
