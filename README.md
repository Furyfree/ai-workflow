# Portable Coding-Agent Workflow

`ai-workflow` provides shared development instructions, six reusable workflows,
a narrow Codex command policy, and a tested Linux installer for Codex and
Claude Code.

The repository keeps portable behavior in one place while leaving credentials,
models, plugins, permissions, and project-specific rules under their existing
owners.

## Quick start

Use a checkout that will remain at a stable path:

```sh
./scripts/validate.sh
./scripts/install.sh --dry-run
./scripts/install.sh
```

Restart Codex and Claude Code after installation so they discover the linked
instructions and skills.

## Repository map

- `global/shared.md`: global instructions shared by Codex and Claude Code
- `.agents/skills/`: canonical reusable workflows and project templates
- `codex/rules/ai-workflow.rules`: Codex-only low-risk command allowlist
- `.codex/rules/repository-pr.rules`: temporary project bootstrap policy
- `scripts/`: installation, uninstall, isolated tests, and validation
- `SPEC.md`: accepted behavior and boundaries
- `ROADMAP.md`: phase order and exit criteria
- `TASKS.md`: current work and validation status
- `roadmap/`: supporting research for linked complex phases
- `.github/`: pull-request template, CI, and Dependabot configuration

Root `AGENTS.md` and `CLAUDE.md` apply only while maintaining this repository;
they are not installed globally.

## Included workflows

- `ai-project-manager`: reconcile project documents and define one bounded phase
- `html-plan`: derive a self-contained visual explanation from canonical sources
- `local-pr-review`: review an existing GitHub pull request from a local checkout
- `passthrough`: audit and tighten a repository as a whole
- `pr-readiness`: verify scope, validation, CI, review state, and commit structure
- `subagent`: delegate bounded independent work and return control for integration

Each workflow's `SKILL.md` is its source of truth. The project-manager skill
also provides optional `AGENTS.md`, `CLAUDE.md`, `SPEC.md`, `ROADMAP.md`, and
`TASKS.md` templates.

## Installation

Installation requires Linux, Bash, and the common GNU utilities checked by the
installer, including `readlink`. Validation additionally requires `find`.

Preview or install one agent with:

```sh
./scripts/install.sh --agent codex --dry-run
./scripts/install.sh --agent claude --dry-run

./scripts/install.sh --agent codex
./scripts/install.sh --agent claude
```

Without `--agent`, both agents are selected.

The installer creates these managed links:

```text
Codex instructions   ~/.codex/AGENTS.md
Codex rules          ~/.codex/rules/ai-workflow.rules
Codex skills         ~/.agents/skills/<skill>
Claude instructions  ~/.claude/CLAUDE.md
Claude skills        ~/.claude/skills/<skill>
```

The links point into this checkout. Edits and branch changes therefore affect
new agent sessions immediately, and moving or deleting the checkout breaks the
installation.

`CODEX_HOME`, `AGENTS_HOME`, and `CLAUDE_CONFIG_DIR` override the default
targets. Tests and controlled installations may also use
`AI_WORKFLOW_STATE_DIR`, `--source`, or `--state-dir`.

### Backups and recovery

Conflicting targets receive timestamped backups. Per-agent manifests under:

```text
${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}/
```

record managed links, sources, and backups. Repeated installation leaves
correct links alone and refuses to overwrite locally redirected managed links.

An installation failure rolls back changes for the active agent. If a combined
installation reaches Claude after completing Codex, the completed Codex state
remains recorded and can be uninstalled safely.

Preview uninstall:

```sh
./scripts/uninstall.sh --dry-run
```

Remove managed links and restore backups:

```sh
./scripts/uninstall.sh
```

Both commands accept `--agent codex` or `--agent claude`.

## Verify discovery

In a disposable repository, confirm that Codex and Claude Code report the
shared instructions and can discover all six workflows. For Codex, verify the
installed policy directly:

```sh
codex execpolicy check --pretty \
  --rules "${CODEX_HOME:-$HOME/.codex}/rules/ai-workflow.rules" \
  -- git status --short
```

The result should report `allow`. These checks use real agent homes and remain
separate user-run actions.

The project-local `.codex/rules/repository-pr.rules` is only a bootstrap copy.
Remove it and its validation references after controlled discovery proves the
installed global policy.

## Review workflow

`pr-readiness` runs local validation and, when available, an authenticated
CodeRabbit review. Actionable findings block publication; unavailable
CodeRabbit is reported but does not block the remaining checks.

CodeRabbit setup is optional and is never run automatically:

```sh
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
coderabbit auth login
coderabbit auth status --agent
```

After a real installation, the installer prints only the missing steps: setup
when the CLI is absent, or authentication when the installed CLI is not
authenticated. It prints no CodeRabbit guidance when authentication is current.

The first command downloads and executes remote code. Inspect it first unless
you trust the source. This repository uses the local CLI rather than the
CodeRabbit GitHub App. The app's repository access has been removed; local CLI
authentication remains available for readiness checks.

For an existing GitHub pull request, `local-pr-review` checks the exact remote
head and reports locally. Posting a review comment requires a separate explicit
request and uses the account reported by `gh auth status`.

Hosted Codex review is configured for this repository with automatic reviews
off. Request a review with `@codex review` when useful. See the
[Codex code review settings](https://chatgpt.com/codex/settings/code-review).

## Validation

Run the same deterministic gate used by CI:

```sh
./scripts/validate.sh
```

It checks required files, skill metadata and templates, private runtime state,
shell syntax, ShellCheck, Codex policy behavior, installer behavior, and
working-tree and staged whitespace. ShellCheck and Codex are optional locally
with a notice; CI requires both.

## Boundaries

The installer manages only instruction, skill, and Codex-rule symlinks plus
their manifests and backups. It does not manage credentials, sessions, plugins,
models, MCP servers, trust, permission profiles, `config.toml`, hooks,
deployment, or infrastructure.

The Codex policy allows documented low-risk inspection and validation commands.
It does not authorize Git mutations or publication. Commit, push, pull-request
creation or update, merge, installation, deployment, and infrastructure
actions each require explicit user intent.
