# Implementation guide

This document explains the first-release components in `ai-workflow`. It
describes what each part is, why it belongs here, how it works, how it is
tested, and what it must not take responsibility for.

It is an implementation reference, not a task list. `ROADMAP.md` controls phase
order, `TASKS.md` tracks current work, and `SPEC.md` remains the requirements
source of truth.

## Design goal

The repository should provide a small, portable development workflow that can
be used by more than one coding agent. It should make good behavior easy to
reuse without copying Patrick's machine configuration into every project.

The useful parts of Titus's approach are:

- one canonical source for global instructions and skills
- clear project planning documents
- reversible and repeatable installation
- isolated installer tests
- one complete local validation command
- branches, pull requests, CI, AI review, and human merge

The repository should adopt those patterns without copying Titus's personal
paths, permissions, command allowlists, models, plugins, or domain skills.

## 1. Repository maintenance instructions

### What it is

The root `AGENTS.md` tells coding agents how to work on `ai-workflow` itself.
The root `CLAUDE.md` is a thin adapter that routes Claude Code to those
instructions.

### Why we need it

A fresh agent must be able to understand the repository without relying on
conversation history or another repository. One canonical instruction file
also prevents Codex and Claude instructions from drifting apart.

### How it should work

- Keep repository rules in root `AGENTS.md`.
- Keep root `CLAUDE.md` limited to routing and unavoidable Claude-specific
  differences.
- Route agents to `SPEC.md`, `ROADMAP.md`, `TASKS.md`, and relevant references
  instead of loading every document for every task.
- Keep the current implementation stop point visible.

### How we prove it works

- Start fresh Codex and Claude sessions in the repository.
- Confirm both identify the current phase, relevant documents, validation, and
  authorization boundaries.
- Confirm Claude does not require a duplicated copy of the full instructions.

### Boundary

These files maintain this repository. They are not the global instructions
installed for use in other repositories.

## 2. Shared global instructions

### What it is

A small set of default instructions applied across Patrick's repositories,
independent of the coding agent being used.

### Why we need it

Rules such as preserving unrelated changes, checking the worktree before
editing, validating before claiming completion, protecting secrets, and
stopping before external actions should not be rewritten in every repository.

### How it should work

The shared instructions should cover only durable cross-repository behavior:

- discover and follow repository-specific instructions
- inspect the branch and existing changes
- preserve unrelated work
- make narrow, reviewable changes
- report validation honestly
- protect secrets and private runtime state
- treat destructive and external actions as explicit boundaries
- route detailed workflows to skills

### How we prove it works

- Install the instructions into isolated agent homes.
- Open a synthetic repository with local instructions.
- Confirm the agent follows both global and repository-specific rules.
- Confirm repository-specific instructions take precedence where appropriate.

### Boundary

Do not put project commands, language style, personal paths, model settings,
MCP configuration, trust entries, sandbox modes, approval policy, or broad
command allowlists in the shared instructions.

## 3. Agent adapters

### What it is

Small files or installation mappings that deliver the shared workflow in the
format and location expected by a particular agent.

The first adapters are:

- Codex
- Claude Code

### Why we need it

Agents do not necessarily use the same filenames, global instruction paths,
skill paths, or precedence rules. Pretending they are identical would make the
repository portable only in name.

### How it should work

- Keep the shared policy canonical.
- Put only required tool-specific routing in each adapter.
- Document the exact installed source and target for each agent.
- Verify actual discovery behavior instead of assuming it.
- Add future agents through new adapters rather than copied workflow bodies.

### How we prove it works

- Use a temporary home and temporary test repository for each agent.
- Install only the selected adapter.
- Ask the agent to report a unique instruction marker.
- Confirm local repository instructions are also discovered.
- Confirm removing the adapter removes the global behavior.

### Boundary

An adapter must not become a second full copy of the global instructions. Tool
configuration that is unrelated to workflow installation stays outside the
first release.

## 4. Project document templates

### What it is

Reusable starting templates for:

- `AGENTS.md`
- `SPEC.md`
- `ROADMAP.md`
- `TASKS.md`

### Why we need it

These documents give requirements, sequence, current state, and working rules
separate homes. That makes it easier for humans and agents to understand what
is accepted, what is planned, and what is currently authorized.

### How it should work

- Keep templates short and adaptable.
- Explain the role of each document inside the template.
- Remove unused sections instead of leaving placeholder text.
- Never overwrite an existing project document silently.
- Reconcile with existing repository conventions before proposing replacement.

### How we prove it works

Test the templates against:

- an empty repository
- a repository with only a README
- a repository with existing agent instructions
- a repository with an existing specification or roadmap
- a repository whose current documents conflict

### Boundary

Templates provide structure, not generic filler. Project requirements,
commands, architecture, hazards, deployment rules, and ownership remain local
to the project.

## 5. Canonical skill format

### What it is

Reusable workflows stored under:

```text
.agents/skills/<skill-name>/SKILL.md
```

A skill may also contain references, scripts, templates, or optional
agent-specific metadata when those additions are justified.

### Why we need it

Global instructions should remain small. Skills let an agent load a detailed
workflow only when the current task needs it.

### How it should work

- Give every skill valid frontmatter with a matching name and clear trigger.
- Keep the main workflow agent-neutral where practical.
- Use references for detailed material needed only in some cases.
- Use helper scripts only for deterministic or repeatedly error-prone work.
- Keep one canonical copy of each skill.

### How we prove it works

- Validate frontmatter, names, directories, links, and prohibited placeholders.
- Test triggering and non-triggering prompts.
- Test the workflow against realistic repository fixtures.
- Confirm optional metadata is not treated as the workflow source of truth.

### Boundary

Do not add a skill merely because it might be useful someday. Add one after a
workflow repeats enough to justify maintenance.

## 6. `ai-project-manager` skill

### What it is

The planning and repository-structure skill. It creates or reconciles project
documents and turns an accepted roadmap outcome into one bounded phase of work.

### Why we need it

Planning documents are useful only when their roles stay distinct and existing
requirements are respected. This skill gives agents a repeatable way to plan
without immediately implementing or rewriting project intent.

### How it should work

1. Inspect repository instructions, documents, branch state, and current
   changes.
2. Identify missing requirements, conflicts, risks, and unresolved decisions.
3. Create missing documents only when requested.
4. Reconcile existing documents instead of replacing them blindly.
5. Define acceptance criteria, validation, rollback, and pause points.
6. Select one authorized phase.
7. Stop before implementation when the request is planning-only.
8. Update completed tasks only after their evidence exists.

### How we prove it works

- Test empty, partially documented, mature, and conflicting repositories.
- Confirm existing requirements are preserved.
- Confirm planning-only requests produce no implementation changes.
- Confirm a selected phase is small enough to review.

### Boundary

There should not be a separate repository-structure skill initially. Document
creation and project planning share the same context and conflict checks, so
keeping them together avoids duplicated behavior.

## 7. `pr-readiness` skill

### What it is

A workflow for determining whether a local change and its pull request have
current, complete evidence.

### Why we need it

Passing one test is not the same as being ready to merge. Readiness also
depends on the complete diff, untracked files, full validation, manual testing,
CI, review feedback, and whether all evidence belongs to the latest commit.

### How it should work

1. Inspect the branch, status, complete diff, and untracked files.
2. Identify unrelated or accidental changes.
3. Run focused checks.
4. Run the repository's complete local validation command.
5. Run local CodeRabbit when installed and applicable.
6. Record unavailable, skipped, or failed checks exactly.
7. Inspect the pull request and verify CI is current for the latest commit.
8. Inspect actionable review comments and unresolved threads.
9. Check required manual evidence.
10. Report readiness without performing an unauthorized commit, push, PR,
    merge, deployment, installation, or apply.

### How we prove it works

Use fixtures or controlled repositories representing:

- a clean passing change
- unrelated modified files
- untracked files omitted from the diff
- failed or unavailable local validation
- unavailable CodeRabbit
- stale CI from an older commit
- unresolved review feedback
- missing manual testing

### Boundary

The skill may diagnose readiness. Publishing or merging remains a separate
explicit action.

## 8. `html-plan` skill

### What it is

A workflow for turning a broad Markdown plan into a self-contained visual HTML
explanation.

### Why we need it

Architecture, dependencies, repository comparisons, phase relationships, and
large plans are often easier to understand visually than as several pages of
prose.

### How it should work

- Use HTML only when a visual materially improves understanding.
- Select the smallest useful form: flow, timeline, table, hierarchy, or
  architecture view.
- Keep the canonical plan in Markdown.
- Link the generated view back to its source documents.
- Use semantic HTML, readable colors, responsive layouts, and print styles.
- Avoid required network assets so the result works offline.
- Render and inspect desktop and narrow layouts when browser tooling exists.

### How we prove it works

- Generate a view from a known test plan.
- Check required sections and source links.
- Verify there are no required external assets.
- Check HTML structure and accessibility basics.
- Render desktop and mobile screenshots.
- Check for clipping, unreadable text, and horizontal overflow.

### Boundary

Generated HTML is a derived explanation. It must not become a second
specification, roadmap, or task tracker.

## 9. Project-specific repository instructions

### What it is

An `AGENTS.md` in Homelab, Nimbus, Dotfiles, or another project that explains
that repository's commands, architecture, risks, and validation.

### Why we need it

Global instructions cannot know that Homelab changes may affect real
infrastructure, that Nimbus has a particular application architecture, or that
Dotfiles can alter a user's interactive environment.

### How it should work

Each repository should document:

- its purpose and important paths
- exact focused and full validation commands
- generated-file rules
- secrets and private-state boundaries
- dangerous operations and required approval
- manual tests and target environments
- deployment, installation, or infrastructure gates

### How we prove it works

- Ask a fresh agent to explain how it would validate a representative change.
- Confirm it finds the correct commands and risks without consulting
  `ai-workflow`.
- Confirm global rules still apply without duplicating their full text.

### Boundary

`ai-workflow` may provide a template, but it must not own the changing project
requirements of Homelab, Nimbus, or Dotfiles.

## 10. Canonical local validation

### What it is

A single `scripts/validate.sh` command that checks the repository and runs the
same deterministic gate used by CI.

### Why we need it

Developers and agents should not have to reconstruct the required checks from
workflow YAML. A single command also reduces differences between local and CI
results.

### How it should work

The validator should aggregate useful failures and check:

- required repository files and directories
- Markdown links and formatting
- skill frontmatter, names, references, and inventory
- adapter and template structure
- shell syntax and ShellCheck when required
- tracked private runtime state
- installer syntax and integration tests
- generated HTML fixtures
- unresolved placeholders

Optional tools must be reported honestly. A required check must not silently
become optional merely because it is missing.

### How we prove it works

- Run it against the valid repository.
- Create one failing fixture for every rule.
- Confirm each fixture fails with a useful message.
- Confirm CI invokes this exact entry point.

### Boundary

The validator proves deterministic repository properties. It does not replace
semantic review or target-environment manual testing.

## 11. Linux installer

### What it is

A script that installs selected global instructions, adapters, templates, and
skills into supported agent locations.

### Why we need it

Manual copying causes drift and makes recovery uncertain. Installation should
be previewable, repeatable, and safe when target files already exist.

### How it should work

- Support `--dry-run`.
- Accept explicit source, target, agent, and installation-mode choices.
- Classify each target as create, update, skip, or conflict.
- Back up conflicts before replacement.
- Preserve an already equivalent target.
- Validate installed content.
- Produce a clear operation summary.
- Require no administrator privileges for normal installation.

The recommended model is:

- copy mode as the stable default
- optional link mode for developing `ai-workflow` locally
- generated or rendered files always copied

The final choice must be recorded in `SPEC.md` and `docs/DECISIONS.md` before
implementation.

### How we prove it works

- Run only against temporary homes and agent directories in tests.
- Verify dry-run makes no target changes.
- Verify first install, repeated install, update, conflict, and recovery.
- Verify paths containing spaces and unusual but valid characters.
- Verify moving or removing the source checkout has the documented result.

### Boundary

The installer must not install agents, authenticate services, modify broad
trust, weaken sandboxes, add command allowlists, or manage general model and MCP
configuration.

## 12. Installation manifest, backup, and recovery

### What it is

A machine-readable record of what an installation changed, where every target
came from, which mode was used, and where conflicts were backed up.

### Why we need it

Timestamped backups are useful, but recovery should not depend on remembering
which files an old script touched. A manifest also enables safer updates and
uninstallation.

### How it should work

Record at least:

- repository version or commit
- installation time
- selected agents and components
- source and target paths
- copy or link mode
- created, replaced, preserved, and skipped targets
- backup locations

Provide a restore or uninstall operation that previews its work, removes only
managed targets, and restores known backups where requested.

### How we prove it works

- Install into a temporary home and verify the manifest.
- Restore the original conflicting files.
- Remove files created by the installer without removing unrelated files.
- Test interrupted or partially failed installation.
- Test a second install after recovery.

### Boundary

Recovery must never recursively remove a broad directory or infer ownership
from filename alone.

## 13. Installer integration tests

### What it is

Shell tests that run the real installer inside synthetic temporary homes.

### Why we need it

An installer mutates user configuration. Parsing successfully does not prove
that backups, links, copies, repeated installation, or recovery work.

### How it should work

Cover:

- empty target
- existing conflicting files
- equivalent targets
- repeated installation
- changed source content
- copy and link modes
- dry-run
- invalid input
- interrupted installation
- restore and uninstall
- guarded cleanup

Use fake executables for optional external commands. Never use real credentials
or the developer's actual agent directories.

### How we prove it works

The test must assert filesystem contents, file types, links, manifests, backup
contents, exit codes, and command output. Running the test twice must not leave
state outside its temporary directory.

### Boundary

Integration tests should test our supported contract. They should not simulate
unmanaged agent internals or external authentication.

## 14. Linux distribution test containers

### What it is

Small container-based tests that run installation and validation on selected
Linux distributions.

### Why we need it

Different distributions can have different shell versions, command locations,
base utilities, package names, and default permissions. Containers provide a
repeatable way to catch portability assumptions without changing the host.

### How it should work

- Start with a small representative set such as Ubuntu, Debian, and Fedora.
- Use the same installer integration test inside each image.
- Keep images and package installation minimal.
- Run locally through Docker or Podman where available.
- Run an appropriate subset in CI.
- Document exactly what container testing does and does not prove.

### How we prove it works

- Run the same fixture successfully in every supported image.
- Include a fixture that fails when a required command is absent.
- Confirm filenames, paths with spaces, permissions, and shell behavior.
- Pin or deliberately update base-image versions.

### Boundary

Containers do not prove desktop integration, a real login shell, host agent
discovery, systemd behavior, or hardware access. Those require targeted manual
testing.

## 15. Pull-request template

### What it is

A default GitHub pull-request body that asks for the evidence needed to review
and merge a change.

### Why we need it

Without a consistent structure, test commands, manual evidence, skipped checks,
and known limitations are easily omitted.

### How it should work

Include:

- problem
- approach
- scope and non-goals
- important decisions or deviations
- exact focused and full validation
- local AI review status
- CI status on the latest commit
- manual testing and environment
- screenshots for visible changes
- unresolved limitations and follow-up

### How we prove it works

Use it on the foundation pull request and the Homelab pilot. Remove fields that
consistently create noise and add only evidence that reviewers actually need.

### Boundary

Checkboxes do not prove a result. Commands, links, output summaries, and current
GitHub state remain the evidence.

## 16. Local AI review and CodeRabbit

### What it is

An independent semantic review after deterministic local validation and before
or during pull-request review.

### Why we need it

Linters and tests do not reliably find requirement gaps, confusing behavior,
unsafe assumptions, or maintainability problems. A separate reviewer can
inspect the complete change from a different perspective.

### How it should work

The `pr-readiness` skill should:

- detect whether the local CodeRabbit CLI is available
- run it after deterministic checks
- include uncommitted and untracked work where supported
- inspect findings rather than applying them blindly
- fix valid findings and rerun affected deterministic checks
- cap repeated AI-review passes to avoid an endless loop
- record when the review is unavailable or intentionally skipped

Remote CodeRabbit review on the pull request may be added separately. A
repository `.coderabbit.yaml` should be introduced only when default behavior
needs a documented change.

### How we prove it works

- Test available, unavailable, failing, and no-finding paths.
- Confirm untracked files are not omitted.
- Confirm a CodeRabbit failure cannot be reported as a completed review.
- Confirm AI suggestions do not override requirements or deterministic tests.

### Boundary

AI review is advisory evidence. It does not replace CI, human judgment, or
manual target testing.

## 17. GitHub Actions validation

### What it is

CI that runs repository validation for pull requests and the main branch.

### Why we need it

Local evidence can be stale, incomplete, or affected by the developer's
environment. CI repeats the canonical gate in a clean environment tied to a
specific commit.

### How it should work

- Start with Linux because that is the first supported installer platform.
- Invoke `scripts/validate.sh` instead of duplicating its logic.
- Use minimum token permissions.
- Pin third-party actions to full commit hashes with readable version comments.
- Add timeouts.
- Cancel stale runs for the same pull request.
- Add platform jobs only after that platform is supported and tested.

### How we prove it works

- Open a pull request with a passing change.
- Introduce a controlled validation failure and confirm CI blocks it.
- Push a replacement commit and confirm readiness uses the latest result.
- Confirm the workflow does not request write permissions.

### Boundary

CI does not authorize merge or deployment. Required checks and branch
protection remain human-controlled repository settings.

## 18. Dependency review and Dependabot

### What it is

Two GitHub maintenance mechanisms:

- dependency review rejects newly introduced dependencies with unacceptable
  known vulnerabilities
- Dependabot proposes updates to pinned GitHub Actions

### Why we need it

Pinned actions improve reproducibility, but they still need deliberate updates.
Dependency review adds a focused security signal to pull requests that change
dependencies.

### How it should work

- Run dependency review only for pull requests.
- Give it read-only permissions.
- Start with a high-severity failure threshold.
- Schedule weekly GitHub Actions update checks.
- Limit concurrent automated update pull requests.
- Review and validate automated updates like any other change.

### How we prove it works

- Validate the workflow syntax.
- Confirm Dependabot recognizes the GitHub Actions ecosystem.
- Review the first generated update pull request manually.
- Confirm the dependency-review job is skipped outside pull requests.

### Boundary

Automated update proposals must not auto-merge initially.

## 19. Branch protection and repository settings

### What it is

GitHub settings that require the agreed pull-request and validation workflow
before changes reach `main`.

### Why we need it

Documenting a PR workflow does not enforce it. Titus's repository documents
good PR behavior, but branch protection is not stored in its repository.

### How it should work

After CI exists:

- require pull requests for normal changes
- require the canonical validation check
- require the branch to be current when appropriate
- prevent unresolved required review from being bypassed accidentally
- keep administrator bypass and emergency behavior explicit

Record the chosen settings in repository documentation because GitHub settings
are external state.

### How we prove it works

- Attempt to merge a pull request with failing validation.
- Confirm a passing current commit can reach the human merge decision.
- Confirm the required check name matches the actual workflow.

### Boundary

Do not require a check before it exists and is stable. Do not automate merge in
the first release.

## 20. Documentation and source references

### What it is

Focused documents explaining architecture, installation, recovery, skills, and
workflow decisions, with Titus's repositories retained as attributed
references.

### Why we need it

Implementation details that do not belong in global instructions or skills
still need a durable home. Source attribution also lets us compare future
changes against the exact Titus version that informed the design.

### How it should work

- Keep requirements in `SPEC.md`.
- Keep ordering and exit criteria in `ROADMAP.md`.
- Keep current work in `TASKS.md`.
- Keep accepted and unresolved choices in `docs/DECISIONS.md`.
- Keep explanatory material in focused files under `docs/`.
- Reference an exact upstream commit when behavior was adapted from Titus.

### How we prove it works

- Validate local links.
- Confirm documents do not contradict each other.
- Ask a fresh agent which document owns a proposed change.
- Remove stale instructions when behavior changes.

### Boundary

Documentation should explain real behavior. It must not describe planned
features as already implemented.

## 21. Homelab pilot

### What it is

The first real use of the complete workflow on a bounded Homelab change.

### Why we need it

Synthetic tests can prove mechanics, but only real work shows whether the
instructions are understandable, the PR skill gathers useful evidence, and the
workflow creates too much friction.

### How it should work

1. Install the workflow in a controlled way.
2. Reconcile Homelab's repository instructions and planning documents.
3. Select one low-risk, reviewable change.
4. Work on a short-lived branch.
5. Run focused and complete Homelab validation.
6. Run local AI review.
7. Open a pull request with exact evidence.
8. Verify CI and review state on the latest commit.
9. Complete required manual or infrastructure checks.
10. Merge manually.
11. Record lessons in `ai-workflow`.

### How we prove it works

The pilot is complete only when one real pull request follows the workflow from
planning through human merge and produces a short list of retained or changed
workflow decisions.

### Boundary

The pilot must not use an unsafe infrastructure apply merely to exercise the
workflow. Choose a change whose real validation can be completed safely.

## 22. Nimbus and Dotfiles adoption

### What it is

The staged rollout after the Homelab pilot:

1. Nimbus
2. Dotfiles

### Why we need it

The repositories have different risks. Nimbus tests normal application
development, while Dotfiles tests installation, shell behavior, and recovery
on the developer's environment.

### How it should work

- Apply lessons from Homelab before changing Nimbus.
- Stabilize the Nimbus handoff before adopting the workflow in Dotfiles.
- Keep each repository's commands and hazards local.
- Change shared workflow only when the improvement is genuinely reusable.

### How we prove it works

Each repository should complete at least one representative pull request with
current local validation, AI review, CI, manual evidence where required, and a
human merge.

### Boundary

Adoption does not mean making the repositories structurally identical. They
share a workflow, not an architecture.

## Deferred components

The following should not be part of the first release:

- Windows and PowerShell installation
- local model profiles
- RTK configuration
- automatic plugin installation
- broad Codex command rules
- MCP server configuration
- trust, sandbox, or approval-policy management
- automatic CodeRabbit authentication
- automatic merge
- a large library of language and infrastructure skills
- release automation that has not yet been needed

Deferring them keeps the first release small enough to test properly. A
deferred component can be added later through its own specification, validation
plan, and pull request.

## Implementation and adoption order

The first-release implementation covers the foundation through the selected
Linux distribution tests. The remaining order is:

1. Publish the implementation through a pull request.
2. Verify the first GitHub Actions run before configuring required checks.
3. Verify controlled Codex and Claude installs and discovery.
4. Complete the Homelab pilot.
5. Apply the pilot lessons to Nimbus.
6. Adopt in Dotfiles after the Nimbus handoff is stable.
