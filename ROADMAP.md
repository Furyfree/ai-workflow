# AI workflow roadmap

This file tracks status and work order. Keep entries short; current task detail
belongs in `TASKS.md`.

Current phase: **controlled discovery**.

## 1. Small portable core

- [x] Keep one shared instruction body for Codex and Claude Code.
- [x] Link instructions and six skills without managing private runtime state.
- [x] Support preview, conflict backups, repeated installation, drift refusal,
      and uninstall.
- [x] Reduce validation and CI to one deterministic Linux gate.
- [x] Keep this roadmap and its reusable template short and checkbox-driven.
- [x] Include a narrow, tested Codex rules file for low-risk commands.
- [x] Encode proportional editing and anti-bloat defaults globally.
- [x] Add current-agent and one-subagent repository passthrough modes.
- [x] Support one subagent audit before the independent main-agent pass.
- [x] Add a provider-aware subagent skill for Codex, Claude, and Grok.
- [x] Add user-approved multi-task delegation with dependency grouping,
      current-model defaults, bounded edits, and main-agent integration.
- [x] Resolve the latest stable flagship subagent at high reasoning and fail
      closed when provider access or model availability is missing.
- [x] Limit normal subagent passthrough to one pass and explicit loop mode to
      three sequential passes with early stopping.
- [x] Keep repository inspection rules independent of live permission profiles
      and leave mutation commands unmatched.
- [x] Document local-only CodeRabbit installation, GitHub App removal, and
      unavailable-review fallback.
- [x] Block pull-request publication on local CodeRabbit findings without
      blocking when CodeRabbit is unavailable.
- [x] Document manual Codex review with automatic reviews disabled.
- [x] Add an authenticated local pull-request review fallback with explicit
      authorization before posting a GitHub comment.
- [x] Use local pull-request review in readiness checks and propose coherent
      commit groups when one large commit would mix independent outcomes.
- [x] Document useful Codex slash-command handoffs without making skills depend
      on user interface controls.
- [x] Move read-only branch and pull-request inspection into the canonical
      global Codex policy.
- [x] Review the complete tracked and untracked change.

## 2. Controlled discovery

Start after the portable core passes locally and installation is authorized.

- [ ] Confirm Codex and Claude Code load the linked global instructions.
- [ ] Confirm both agents discover and invoke all six skills.
- [ ] Confirm fresh requests select only matching skills and do not inherit a
      workflow from earlier unrelated work.
- [ ] Confirm repository-foundation planning assesses optional Codex Cloud and
      hosted review without changing external state.
- [ ] Confirm the installed global Codex policy handles required read-only
      branch and pull-request inspection.
- [ ] Remove `.codex/rules/repository-pr.rules` and its documentation and
      validation references after the global policy is proven.
- [ ] Handle discovery differences through paths or repository routing without
      duplicating shared instructions.
- [ ] Record recovery steps and any behavior that could not be verified.

## 3. Real adoption

Start after controlled discovery passes.

- [ ] Use the workflow for one bounded Homelab pull request.
- [ ] Complete local validation, review, required manual evidence, and human
      merge.
- [ ] Keep only workflow steps that solve observed problems.

## 4. Pi personal tooling

The existing notes under `~/git/docs/pi/` are migration input. This repository
should become their source of truth instead of maintaining parallel plans.

- [ ] Create an in-repository Pi package area and consolidate the existing
      design, extension, skill, prompt, and package notes into it.
- [ ] Preserve Pi's native extension, skill, prompt, and package boundaries.
- [ ] Build in value order: carryover, commit, then browser.
- [ ] Add Pi installation and uninstall only after the first workflows are
      useful and the package layout is stable.
- [ ] Prove discovery without tracking credentials, sessions, or runtime state.
- [ ] Remove the migrated copies from `~/git/docs/pi/` only after review.

## 5. [Forgejo pull-request workflow](roadmap/forgejo-pr-review.md)

Start after a local Forgejo instance and one representative repository exist.

- [ ] Confirm the installed Forgejo version and evaluate `tea` against it.
- [ ] Choose `tea` or the Forgejo REST API for pull requests, reviews, comments,
      and unresolved threads.
- [ ] Extend local pull-request review without duplicating the review workflow.
- [ ] Prove branch, pull-request, local Codex review, comment, and human-merge
      behavior with a repository-scoped token.
- [ ] Consider Actions automation only after the manual workflow is safe and
      useful.

## 6. Evidence-led refinements

- [ ] Add instructions or automation only after repeated friction demonstrates
      a need.
- [ ] Expand the Codex allowlist only after repeated approval friction shows a
      low-risk command is missing.
- [ ] Never broadly allow generic shells, privilege escalation, publishing,
      remote administration, package installation, or infrastructure changes.
- [ ] Tighten an existing rule when a correction reveals a repeat mistake
      instead of growing duplicate guidance.
