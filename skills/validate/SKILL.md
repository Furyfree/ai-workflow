---
name: validate
description: Second opinion on a diff, plan, or file from the default set of other models, read-only. Use when the user says "validate", "validate this", "second opinion", "cross-check", "valider", "få en second opinion", "få det tjekket af andre modeller". Not when the user names one model ("get opus to check") - that is the subagent skill.
---

# Validate

[run.sh](run.sh) sits next to this SKILL.md. Set `dir` to the absolute path
of the directory this file was loaded from; never assume the working directory.

1. Gather the diff or plan and context. Uncommitted tracked work: `git diff HEAD`.
   A branch: `git diff <base>...`. New files are in neither: list them with
   `git ls-files --others --exclude-standard` and include the relevant ones.
   Never stage anything. Ask when the scope is unclear. Never include secrets.
   Use the [subagent skill](../subagent/SKILL.md) for provider routing, model
   discovery, and permission checks.
2. Use [prompt.txt](prompt.txt) as the review contract. For external CLIs,
   run `"$dir/run.sh" <file|-> ["what to focus on"]`; `-` reads stdin.
   It adds the contract, starts reviewers in parallel through the shared
   subagent launcher, and prints the directory holding their answers and logs.
   For native reviewers, pass the same contract and collect their results.
3. Read every output. Each ends with `[exit N]`. Anything but `[exit 0]`
   (124 is the time limit), or an empty answer, means that validator is
   unavailable, never LGTM; its `.log` says why. Do not retry it. Delete the
   output directory afterwards. Apply the same failure rule to native results.
4. Check each finding against the real code. Drop the ones that are wrong,
   duplicated, or outside what was asked.
5. Give the user one numbered list: finding, `file:line`, your recommendation.
   If all validators say LGTM, say that in one line.

Never fix anything until the user answers by number.

The default reviewer set and GLM alias are defined in [run.sh](run.sh).
Override the set with `VALIDATORS`; each entry is `provider[:model][@effort]`:

    git diff HEAD | "$dir/run.sh" -  # simple review
    VALIDATORS="grok@high claude:opus@high" "$dir/run.sh" change.diff  # hard review

Use low effort for a simple review and raise it for hard ones, within the
shared rules; an explicit user choice wins.

Entries: `grok`, `claude`, `codex`, `glm`, `opencode:<provider/model>`.
Leave out the model you are running as; a model reviewing itself is not a
second opinion. Claude and Codex run on rate-limited subscriptions; add them
only when the user says so ("validate, with codex too").
