---
name: passthrough
description: Audit and tighten an entire repository for coherence, stale or duplicated material, validation gaps, and AI-generated bloat. Use for passthrough, passthrough subagent, subagent-first passthrough, provider-specific passthrough with Codex, Claude, or Grok, passthrough subagent loop, full repository audit, coherence pass, or repository-wide cleanup.
---

# Repository passthrough

Review the repository as a whole without turning the audit into a rewrite.

## Select the mode

- `passthrough`: complete the pass in the main agent.
- `passthrough subagent` or `full passthrough`: complete the main-agent pass,
  then use `$subagent` for exactly one fresh-context read-only audit with the
  current provider.
- `passthrough subagent codex|claude|grok`: do the same one-subagent pass with
  the selected provider.
- `passthrough subagent first [provider]`, or an explicit request to receive
  subagent feedback before the main pass: use `$subagent` for exactly one
  fresh-context read-only audit, verify its findings, then complete the full
  main-agent pass.
- `passthrough subagent loop [provider]`: only when explicitly requested, run
  sequential fresh-context passes through `$subagent`, one at a time, with a
  maximum of three total subagent passes.

For normal subagent mode, never launch a second subagent. For loop mode, the
main agent verifies and fixes findings before deciding whether another pass is
worth its token cost. Stop early when a pass finds no meaningful issue or when
remaining suggestions are cosmetic, repetitive, or too small to justify
another pass. Subagents must never spawn subagents.

If the chosen provider is unavailable, report it. Do not change live
configuration or silently substitute another provider.

Before an explicitly requested token-heavy subagent loop, the user may inspect
Codex usage with `/usage`. For a long-running conversation, the user may run
`/compact` before the pass when preserving enough context is otherwise a
concern. These are optional user controls; do not invoke or require them
automatically.

In subagent-first mode, use the returned findings as leads, not as the scope of
the main pass. Complete every inspection step below independently.

## Inspect

1. Read applicable instructions and inspect the branch and complete worktree.
2. Inventory tracked files and relevant untracked files. Skip dependencies,
   generated output, caches, binaries, and ignored files unless they matter.
3. Read the canonical requirements, plans, source, configuration,
   documentation, tests, and validation that govern the repository.
4. Check ownership, naming, references, duplication, stale files, mismatches,
   runtime or secret material, and disproportionate code, comments, or
   Markdown.
5. Treat a broad rewrite as a warning unless an explicit end-to-end feature,
   migration, or rewrite justifies it.

## Tighten

- Fix only verified issues and stay within the user's requested authority.
- Follow existing patterns and make the smallest coherent changes.
- Preserve unrelated user work and leave unrelated dead code alone.
- Keep one source of truth and route supporting material to it.
- Add automation only for a deterministic repeated need.
- If the user requested analysis only, report findings without editing.

## Validate and report

Run focused checks and the complete repository gate, then inspect the final
tracked and untracked change. Report the scope inspected, fixes, evidence,
skipped checks, residual risks, and next authorization boundary. When a
subagent was used, name its provider and summarize which findings were
accepted or rejected and why.

A passthrough does not by itself authorize commit, push, pull-request creation,
merge, installation, deployment, privileged action, or infrastructure apply.
Each action requires an explicit user request; repository policy may impose
additional restrictions.
