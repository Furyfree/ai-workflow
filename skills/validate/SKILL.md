---
name: validate
description: Second opinion on a diff, plan, or file from the default set of other models, read-only. Use when the user says "validate", "validate this", "second opinion", "cross-check", "valider", "få en second opinion", "få det tjekket af andre modeller". Not when the user names one model ("get opus to check") - that is the subagent skill.
---

# Validate

1. Put what needs review in one file: `tmp=$(mktemp -d)`, then
   `git diff HEAD > "$tmp/change.diff"` for uncommitted work,
   `git diff <base>... > "$tmp/change.diff"` for a branch, or write a plan to
   `"$tmp/plan.md"`. Ask when the scope is unclear. Never put secrets in it.
2. Run `run.sh <file> ["what to focus on"]`; it sits next to this file. It
   starts the validators in parallel, read-only, five minutes each, and prints
   the directory holding one `.txt` per validator.
3. Read every output. Each ends with `[exit N]`. Anything but `[exit 0]`
   (124 is the time limit), or an empty answer, means that validator is
   unavailable, never LGTM; its `.log` says why. Do not retry it. Delete the
   directory afterwards.
4. Check each finding against the real code. Drop the ones that are wrong,
   duplicated, or outside what was asked.
5. Give the user one numbered list: finding, `file:line`, your recommendation.
   If all validators say LGTM, say that in one line.

Never fix anything until the user answers by number.

The default reviewers are Grok and GLM. Change the set with `VALIDATORS`:

    VALIDATORS="grok glm codex" run.sh <file>      # add GPT through Codex
    VALIDATORS="glm claude:opus" run.sh <file>     # name:model picks a model

Entries: `grok`, `claude`, `codex`, `glm`, `opencode:<provider/model>`. Leave
your own model out: if you are Grok or GLM, set `VALIDATORS` without
yourself. A model reviewing itself is not a second opinion. Claude and Codex run on rate-limited subscriptions; add them only
when the user says so ("validate, with codex too"). Look a model name up
first (`claude --help`, `grok models`, `opencode models`); never guess it.
