# AI workflow roadmap

This file tracks status and work order. Keep entries short; current task detail
belongs in `TASKS.md`.

Current phase: **small portable core**.

## 1. Small portable core

- [x] Keep one shared instruction body for Codex and Claude Code.
- [x] Link instructions and five skills without managing private runtime state.
- [x] Support preview, conflict backups, repeated installation, drift refusal,
      and uninstall.
- [x] Reduce validation and CI to one deterministic Linux gate.
- [x] Keep this roadmap and its reusable template short and checkbox-driven.
- [x] Include a narrow, tested Codex rules file for low-risk commands.
- [x] Encode proportional editing and anti-bloat defaults globally.
- [x] Add current-agent and one-subagent repository passthrough modes.
- [x] Add a provider-aware subagent skill for Codex, Claude, and Grok.
- [x] Limit normal subagent passthrough to one pass and explicit loop mode to
      three sequential passes with early stopping.
- [x] Keep the repository PR workflow independent of live permission profiles.
- [x] Document optional CodeRabbit installation and unauthenticated fallback.
- [x] Document manual Codex review with automatic reviews disabled.
- [x] Review the complete tracked and untracked change.
- [ ] Commit, push, or open a pull request only after separate authorization,
      except for this repository's standing draft pull-request workflow.

## 2. Controlled discovery

Start after the portable core passes locally and installation is authorized.

- [ ] Confirm Codex and Claude Code load the linked global instructions.
- [ ] Confirm both agents discover and invoke all five skills.
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

## 5. Evidence-led refinements

- [ ] Add instructions or automation only after repeated friction demonstrates
      a need.
- [ ] Expand the Codex allowlist only after repeated approval friction shows a
      low-risk command is missing.
- [ ] Never broadly allow generic shells, privilege escalation, publishing,
      remote administration, package installation, or infrastructure changes.
- [ ] Tighten an existing rule when a correction reveals a repeat mistake
      instead of growing duplicate guidance.
