---
name: commit
description: Commit, and optionally push, on the current branch. Use when the user says "/commit", "commit this", "commit and push", "commit det", "lav et commit", "commit og push". Not in Pi, where the git extension's /commit does this, and not for pull requests (use pr).
---

# Commit

The request to commit is the go for this flow; every step below still waits
where it says so.

1. Check `git status`. Stop on a detached HEAD or an unfinished merge,
   rebase, cherry-pick, or revert, and say so.
2. Scope is what is staged. With nothing staged, ask: Everything, Pick files,
   or Cancel. Stage nothing before the answer. With nothing to commit but
   unpushed commits, go to step 6 and offer Push or Cancel.
3. Read the staged diff. If it may contain a secret (key, token, password,
   private key, `.env`), show the file and line with the value masked, and
   ask for an explicit yes. Never print the value.
4. Draft one message in the style of `git log --oneline -15`. Use the user's
   guidance if given. Add the attribution lines the harness asks for.
5. Show the message, the files, and any earlier unpushed commits with the
   push destination (`git rev-parse --abbrev-ref @{push}`). Ask one question:
   Commit & push, Commit only, Edit message, or Cancel. Cancel leaves staging
   and files as they were.
6. Commit with the message as approved. Push only if chosen, to that
   destination. Never use `--no-verify`, `--amend`, `--force`, or
   `--no-gpg-sign`.
7. A failed hook or commit: show the error, keep staging, do not retry. A
   rejected push because the remote has new commits: offer the pull skill;
   never force.
