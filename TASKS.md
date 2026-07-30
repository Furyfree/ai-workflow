# AI workflow tasks

## Current phase: Small portable core

- [x] Confirm the smaller first-release boundary.
- [x] Remove overlapping reference documents.
- [x] Simplify the installer to symlink-only behavior.
- [x] Keep dry-run, conflict backups, drift refusal, and uninstall.
- [x] Reduce validation and CI to one Linux gate.
- [x] Remove synthetic skill inventories, HTML test fixtures, and containers.
- [x] Reconcile skill contracts with the simplified specification.
- [x] Run focused installer tests and the complete local gate.
- [x] Inspect the complete tracked and untracked change.
- [x] Add ordered roadmap phases for Pi ownership and evidence-led refinements.
- [x] Replace the reusable roadmap scaffold with a concise checkbox format.
- [x] Adopt useful narrow-work guidance without RTK or broad command rules.
- [x] Add installer support for and validate a narrow Codex command allowlist.
- [x] Add global defaults for existing patterns, proportional scope, and
      removal of generated bloat.
- [x] Add and validate current-agent and one-subagent passthrough modes.
- [x] Add a subagent-first mode followed by an independent main-agent pass.
- [x] Add provider selection through a separate reusable subagent skill.
- [x] Add a multi-task delegation checkpoint, dependency grouping, editable
      assignments, and main-agent review.
- [x] Add latest stable flagship selection at high reasoning with bounded
      no-prompt read-only execution.
- [x] Add an explicit passthrough loop capped at three sequential passes.
- [x] Remove the unsafe dependency on a live Codex permission profile.
- [x] Keep only read-only repository branch and pull-request inspection rules.
- [x] Add optional CodeRabbit installation and unauthenticated fallback.
- [x] Block pull-request publication on local CodeRabbit findings and report
      unavailable CodeRabbit as skipped evidence.
- [x] Add manual Codex review setup with automatic reviews disabled.
- [x] Add local pull-request review with an explicit GitHub comment boundary.
- [x] Use local pull-request review from `pr-readiness` and add coherent
      multi-commit planning.
- [x] Add useful Codex slash-command handoffs without treating them as
      automatic skill actions.
- [x] Move read-only branch and pull-request inspection into the canonical
      global Codex rules.
- [x] Document CodeRabbit as a local-only reviewer and explain GitHub App
      removal.
- [x] Add linked research and a future Forgejo pull-request workflow phase.
- [x] Complete a full repository passthrough and resolve verified findings.
- [ ] After installing and proving the global Codex rules, remove
      `.codex/rules/repository-pr.rules` and its validation and documentation
      references.
- [ ] Remove the CodeRabbit GitHub App after its current pull-request feedback
      is no longer needed; keep the authenticated local CLI.
- [ ] Commit, push, open a pull request, or update an existing pull request
      only after an explicit user request.

## Completion rule

Mark tasks complete only after their evidence exists. Controlled agent
discovery, publication, installation into real agent homes, GitHub settings,
and Homelab adoption remain separate phases.

Evidence for completed workflow controls:

- Passthrough: one Grok-first full pass completed with main-agent verification.
- Repository rules: `./scripts/validate.sh` checks inspection commands and
  confirms mutation commands remain unmatched.
- CodeRabbit gate: two PR updates stopped while actionable findings remained.
