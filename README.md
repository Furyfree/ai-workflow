# ai-workflow

Portable coding-agent instructions and five reusable workflows for Codex and
Claude Code.

## What each part is

### Root `AGENTS.md` and `CLAUDE.md`

These files apply only while an agent is working inside this repository:

- `AGENTS.md` explains how to maintain `ai-workflow`.
- `CLAUDE.md` routes Claude Code to the same repository instructions so the
  rules are not duplicated.

They are not installed globally.

### `global/shared.md`

This is the global instruction file. The installer links it as:

```text
${CODEX_HOME:-$HOME/.codex}/AGENTS.md
${CLAUDE_CONFIG_DIR:-$HOME/.claude}/CLAUDE.md
```

Those filenames are the only agent-specific adaptation needed. The instruction
body stays shared and applies when either agent works in other repositories.
Repository instructions can add or override project-specific commands and
risks. The shared defaults favor existing project patterns, proportional
changes, concise instructions, and removal of redundant code, comments, and
Markdown.

### `codex/rules/ai-workflow.rules`

This is a Codex-only allowlist for low-risk commands that should not need
repeated approval. It covers filesystem metadata, read-only Git metadata,
shell syntax checks, ShellCheck, and local version checks.

It deliberately excludes generic shell execution, file-content readers,
network clients, Git mutations, package installation, privilege escalation,
process control, publishing, containers, infrastructure operations, and
inspection prefixes that can accept later writing or network-enabling flags.
Other files under `~/.codex/rules/` are left alone.

The `match` and `not_match` entries are inline tests for each prefix rule.
`not_match` means that example must remain outside that rule; it is not a
separate forbidden-command list.

### `.agents/skills/`

These are reusable workflows loaded only when a task needs them:

- `ai-project-manager` inspects or reconciles project documents and defines one
  bounded phase. It stops before implementation.
- `pr-readiness` checks the complete change, validation, manual evidence, CI,
  and review state without publishing or merging. Actionable findings from an
  available local CodeRabbit review block publication and are listed with
  proposed fixes for user approval.
- `html-plan` creates a self-contained HTML explanation when a broad roadmap,
  explanation, analysis, architecture, dependency map, or comparison is
  materially easier to understand visually. It has no template or house style;
  the design should fit the subject and audience. It reads canonical sources,
  summarizes relationships, and links back to them. The HTML is a derived view,
  not a second plan or source of truth. Simple questions and short plans should
  remain prose.
- `subagent` delegates one bounded independent task through the current
  provider or an explicitly selected Codex, Claude, or Grok CLI. External runs
  resolve the latest stable flagship at high reasoning and use bounded
  read-only tools. If access or model availability fails, it asks before
  substituting another model.
- `passthrough` audits and tightens a complete repository for coherence, stale
  material, validation gaps, and generated bloat. It supports a main-agent
  pass, one optional provider-selected subagent pass before or after the main
  pass, and an explicit loop mode capped at three sequential subagent passes.
  The main agent independently completes the audit, verifies findings, and owns
  every edit.

The project-manager skill also contains optional templates for `AGENTS.md`,
`CLAUDE.md`, `SPEC.md`, `ROADMAP.md`, and `TASKS.md`.

### `SPEC.md`, `ROADMAP.md`, and `TASKS.md`

These maintain this repository:

- `SPEC.md` owns accepted behavior and boundaries.
- `ROADMAP.md` owns phase order and exit criteria.
- `TASKS.md` owns current work and validation status.

### `.github/`

GitHub uses this directory after it is committed and pushed:

- the workflow runs `./scripts/validate.sh` for pull requests and `main`
- the pull-request template asks for validation evidence
- Dependabot proposes updates to the pinned GitHub Action

Keep Codex automatic review off by default. Request `@codex review` on the
pull requests where another review is useful instead of spending review effort
on every change. This repository does not enable or change that GitHub setting.

Set this up manually:

1. Set up Codex cloud for the repository.
2. Open [Codex code review settings](https://chatgpt.com/codex/settings/code-review).
3. Turn on **Code review** for the repository.
4. Leave **Automatic reviews** off.
5. Comment `@codex review` on a pull request when you want a review.

`@codex` with another instruction starts a Codex task; use the exact
`@codex review` trigger for review.

### `.codex/`

This contains trusted project-local Codex rules for read-only branch and
pull-request inspection. It does not select a permission profile or modify live
Codex configuration. Mutation commands remain unmatched because prefix rules
cannot safely reject trailing flags. Repository instructions define the
authorized workflow. Requested-hunk staging and staged-diff review happen only
after the user explicitly authorizes the associated commit or pull-request
mutation.

## Installation

### Requirements

Installation requires Linux, Bash, and common GNU utilities including `find`
and `readlink`. The repository checkout must remain at the same path while the
links are installed.

### Preview

Preview both agents without changing agent homes, backups, or state:

```sh
./scripts/install.sh --dry-run
```

Preview one agent:

```sh
./scripts/install.sh --agent codex --dry-run
./scripts/install.sh --agent claude --dry-run
```

### Install

Install global instructions and skills for both agents:

```sh
./scripts/install.sh
```

Or select one:

```sh
./scripts/install.sh --agent codex
./scripts/install.sh --agent claude
```

Installed links:

```text
Codex instructions   ~/.codex/AGENTS.md            -> global/shared.md
Codex rules          ~/.codex/rules/ai-workflow.rules
                                                    -> codex/rules/ai-workflow.rules
Codex skills         ~/.agents/skills/<skill>       -> .agents/skills/<skill>
Claude instructions  ~/.claude/CLAUDE.md            -> global/shared.md
Claude skills        ~/.claude/skills/<skill>        -> .agents/skills/<skill>
```

`CODEX_HOME`, `AGENTS_HOME`, and `CLAUDE_CONFIG_DIR` may override the default
targets. Tests and controlled installations may also use
`AI_WORKFLOW_STATE_DIR`, `--source`, or `--state-dir`.

Because installation uses symlinks, edits and branch changes in this checkout
affect active instructions immediately. Moving or deleting the checkout breaks
the links; uninstall before moving it, then install again from the new path.

Start new Codex and Claude Code sessions after installation so they load the
global instructions and skill inventory. Codex also loads rules at startup.

### Optional CodeRabbit CLI

The installer does not run CodeRabbit's interactive setup. At the end it prints
these optional commands:

```sh
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
coderabbit auth login
coderabbit auth status --agent
```

When `pr-readiness` cannot run an authenticated CodeRabbit review, it reports
that state as unavailable evidence and continues all other checks without
blocking publication. When the review runs, actionable findings block
publication: the agent lists each problem and proposed fix, then waits for
approval instead of fixing or publishing automatically.
The free tier is enough for occasional local reviews; paid plans mainly add
higher limits and broader PR features. See
[CodeRabbit plans](https://docs.coderabbit.ai/management/plans).

### Verify discovery

In a disposable repository, confirm each agent reports the shared global
instructions and can discover and invoke all five skills. For Codex, also
confirm the installed policy loads:

```sh
codex execpolicy check --pretty \
  --rules "${CODEX_HOME:-$HOME/.codex}/rules/ai-workflow.rules" \
  -- git status --short
```

The result should report `allow`. These controlled checks use the real agent
homes and therefore remain a separate, user-run step after installation.

### Backups and drift protection

If a target already exists, the installer moves it to a timestamped backup
before creating the link. Per-agent manifests under:

```text
${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}/
```

record each managed link, its source, and any original backup. Repeated
installation leaves correct links alone and records matching existing links so
uninstall can remove them. It refuses to overwrite a managed target that was
replaced or redirected locally.

If installation fails, changes for the active agent are rolled back. When
installing both agents, a completed Codex installation remains recorded if the
later Claude installation fails.

### Uninstall

Preview:

```sh
./scripts/uninstall.sh --dry-run
```

Remove managed links and restore recorded conflicts:

```sh
./scripts/uninstall.sh
```

The `--agent codex` and `--agent claude` selectors are also supported.
Uninstall validates all managed links and backups before changing anything.

## Validate

Run the same deterministic gate used by CI:

```sh
./scripts/validate.sh
```

The gate checks required files, skill metadata and templates, private runtime
state, shell syntax, Codex policy behavior, installer behavior, and diff
whitespace. ShellCheck and Codex are optional in a local run with a clear
notice; CI requires both and installs its pinned Codex CLI version first.

## Boundaries

The installer never manages credentials, sessions, plugins, models, MCP
servers, trust, permission profiles, `config.toml`, hooks, deployment, or
infrastructure. It only creates managed symlinks and manifests. The global
Codex rules authorize low-risk local commands; this repository's trusted local
rules reduce prompts for read-only branch and pull-request inspection. Mutation
commands remain unmatched. Commit, push, opening or updating a pull request,
installation, deployment, and infrastructure actions require an explicit user
request.
