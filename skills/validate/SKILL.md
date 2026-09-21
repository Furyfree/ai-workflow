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
   (124 is the time limit) means that validator is unavailable, never LGTM;
   do not retry it. Delete the directory afterwards.
4. Check each finding against the real code. Drop the ones that are wrong,
   duplicated, or outside what was asked.
5. Give the user one numbered list: finding, `file:line`, your recommendation.
   If all validators say LGTM, say that in one line.

Never fix anything until the user answers by number. Claude is rate-limited:
add it to the default set only when the user says so ("validate, with opus
too"), by setting `VALIDATE_CLAUDE` to the alias from `claude --help`.
