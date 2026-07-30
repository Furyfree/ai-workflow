# AI workflow tasks

## Current phase: First-release publication

- [x] Create the GitHub repository and foundation branch.
- [x] Add repository maintenance instructions.
- [x] Add thin Claude Code routing.
- [x] Define requirements, boundaries, non-goals, and acceptance criteria.
- [x] Define ordered roadmap outcomes.
- [x] Document the development workflow and accepted decisions.
- [x] Add a concise README and tailored `.gitignore`.
- [x] Add shared global instructions and Codex and Claude adapters.
- [x] Add project-document templates.
- [x] Implement `ai-project-manager`, `pr-readiness`, and `html-plan`.
- [x] Implement safe copy and link installation, manifests, backups, rollback,
  drift protection, and uninstall.
- [x] Add deterministic installer, skill, Markdown, and HTML tests.
- [x] Add one canonical local validation command.
- [x] Add Ubuntu, Debian, and Fedora validation containers.
- [x] Add the pull-request template, GitHub Actions, and Dependabot
  configuration.
- [x] Validate locally and in every supported distribution container.
- [ ] Commit, push, and open a draft pull request after user authorization.

## Adoption pending

- [ ] Verify the first GitHub Actions run and only then select required checks.
- [ ] Verify Codex and Claude discovery with controlled user-level installs.
- [ ] Exercise each skill on a real repository without silently overwriting
  existing requirements.
- [ ] Pilot the workflow on one bounded Homelab pull request.
- [ ] Apply pilot lessons to Nimbus.
- [ ] Adopt in Dotfiles after the Nimbus handoff is stable.

## Completion rule

Mark work complete only after its acceptance criteria and required validation
pass. Keep external GitHub actions pending until their live state is verified.
