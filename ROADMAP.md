# AI workflow roadmap

## Phase 1: Repository foundation

Status: Implemented locally; publication pending

### Outcome

A fresh coding agent can understand the project, current work, boundaries, and
validation without relying on another repository.

### Included work

- Add repository instructions and Claude routing.
- Add the specification, roadmap, and current tasks.
- Document workflow and accepted decisions.
- Add a concise README and tailored `.gitignore`.

### Exit criteria

- All foundation documents exist and link correctly.
- The first-release implementation is present and validated.
- The final diff is reviewed before publication.
- The foundation reaches `main` through a pull request.

## Phase 2: Shared instructions and adapters

Status: Implemented locally; live discovery verification pending

### Outcome

Shared global instructions work through tested Codex and Claude Code adapters
without duplicated policy.

### Included work

- Add canonical shared guidance.
- Add thin Codex and Claude Code adapters.
- Verify repository and global instruction discovery.
- Decide copy versus symlink installation.

### Exit criteria

- Both agents load the expected instructions in isolated test repositories.
- Adapter files contain only required tool-specific behavior.

## Phase 3: Project management

Status: Implemented locally; real-repository exercise pending

### Outcome

`ai-project-manager` creates or reconciles project documents and produces one
bounded, validated phase plan.

### Exit criteria

- Empty, existing, and conflicting repository fixtures pass.
- Existing project requirements are never overwritten silently.
- Planning-only requests stop before implementation.

## Phase 4: Pull-request readiness

Status: Implemented locally; live pull-request exercise pending

### Outcome

`pr-readiness` reports exact readiness from local diff through current PR state
without performing unauthorized actions.

### Exit criteria

- Local validation, CodeRabbit failure handling, CI, review, thread, and manual
  evidence paths are tested.
- Commit, push, PR, and merge boundaries remain separate.

## Phase 5: HTML plans

Status: Implemented locally; visual use exercise pending

### Outcome

`html-plan` turns a broad canonical plan into a useful self-contained visual.

### Exit criteria

- Desktop and narrow viewport rendering are checked.
- Accessibility and local asset checks pass.
- The output links to, but does not replace, canonical Markdown.

## Phase 6: Installer and CI

Status: Implemented and validated locally

### Outcome

Selected instructions and skills install safely and repository validation runs
locally and in CI.

### Exit criteria

- Dry-run, backup, conflict, idempotence, and recovery tests pass in temporary
  directories.
- CI runs the same validation command used locally.

## Phase 7: Repository adoption

Status: Planned

### Outcome

The workflow is proven on real changes before broader rollout.

### Included work

1. Pilot Homelab.
2. Apply lessons to Nimbus.
3. Adopt in Dotfiles after the Nimbus handoff is stable.

### Exit criteria

- One Homelab pull request completes local validation, AI review, CI, manual
  evidence where required, and human merge.
- Shared workflow changes remain reusable and project rules remain local.
