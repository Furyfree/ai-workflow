---
name: pull
description: Preview and pull remote changes into the current branch. Use when the user says "/pull", "pull", "pull the latest", "hent ændringer", "pull fra remote". Not in Pi, where the git extension's /pull does this, and not for reviewing pull requests (use pr).
---

# Pull

The request to pull is the go for this flow; every step below still waits
where it says so.

1. Check `git status`. Stop on a detached HEAD, an unfinished merge or
   rebase, a shallow clone, or a sparse checkout, and say so. With no
   upstream, ask which remote branch to pull from.
2. `git fetch`, then compare with `git rev-list --left-right --count HEAD...@{u}`.
   Nothing incoming: say so and stop.
3. Show the incoming commits (`git log --oneline HEAD..@{u}`), changed files
   (`git diff --stat HEAD...@{u}`), and a short summary of what they change.
4. Say which kind of pull it is, then ask: Pull or Cancel (the default).
   - Only behind: fast-forward with `git merge --ff-only @{u}`. Uncommitted
     edits may stay if they do not touch incoming files.
   - Diverged: `git rebase @{u}`, which changes local commit IDs. It needs a
     clean working tree; if not clean, stop and suggest committing first.
     If local commits are already on another remote branch, stop and ask.
5. Never stash, reset, or commit pending work for a pull.
6. Conflicts: show each conflicted file, propose a resolution as a diff, and
   apply it only after a yes. Otherwise `git rebase --abort` and say so.
   Binary files and secrets: leave them to the user.
7. After the pull, show the new state. If local commits are unpushed, ask
   separately whether to push; never force.
