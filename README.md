# Portable Coding-Agent Workflow

`ai-workflow` provides shared development instructions, seven reusable workflows,
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
```

### Real installation

Run installation only as an explicit user action:

```sh
./scripts/install.sh
```

Restart Codex and Claude Code afterward so they discover the linked instructions
and skills.

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

- `ai-project-manager`: assess repository foundations and define one bounded phase
- `html-plan`: derive a self-contained visual explanation from canonical sources
- `liteparse`: read and extract local documents with proportional parsing and OCR
- `local-pr-review`: provide an explicit or fallback review from a local checkout
- `passthrough`: audit and tighten a repository as a whole
- `pr-readiness`: prepare pull-request creation, updates, and merge-readiness checks
- `subagent`: delegate bounded independent work and return control for integration

Each workflow's `SKILL.md` is its source of truth. The project-manager skill
also provides optional `AGENTS.md`, `CLAUDE.md`, `SPEC.md`, `ROADMAP.md`, and
`TASKS.md` templates. Skills are selected from the current request; using one
does not keep it active for later unrelated work.

The `liteparse` workflow requires Node.js 18 or later and a separately managed
LiteParse 2.8 or later CLI. The repository installer links the skill but does
not install or update the runtime. Install it only as an explicit user action:

```sh
npm install -g '@llamaindex/liteparse@^2.8'
liteparse --version
```

PDFs and images need no additional converter. Office documents require
LibreOffice. Remove the separately managed runtime with
`npm uninstall -g @llamaindex/liteparse`; repository uninstall removes only
the managed skill links.

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
shared instructions and can discover all seven workflows. For Codex, verify the
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
local CodeRabbit CLI review. Actionable findings block publication; unavailable
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
If the status check fails, it reports that failure without recommending login.

The first command downloads and executes remote code. Inspect it first unless
you trust the source. CodeRabbit is local-only in this workflow and may run only
through its authenticated local CLI. Its GitHub App and repository access have
been removed. Never invoke CodeRabbit through a GitHub comment, GitHub App,
review request, check, or bot mention. Never post `@coderabbitai review`.

Hosted review means hosted Codex review only. For an existing GitHub pull
request, `pr-readiness` uses hosted Codex review as severity-limited evidence.
It uses `local-pr-review` when explicitly requested or when CodeRabbit or
another current full-severity review is unavailable. Local CodeRabbit CLI
review and local Codex review remain separate local evidence; neither consumes
or impersonates hosted Codex review. Posting local findings requires a separate
explicit request and uses the account reported by `gh auth status`.

The default publication flow is draft-first. An explicit request to create a
pull request includes one hosted Codex review after the draft is published,
unless the user opts out. The only permitted manual hosted-review comment is
exactly `@codex review`, and it may be posted only when Codex GitHub review is
configured and available. If it is unavailable, report that state without
substituting CodeRabbit, another bot, or another GitHub comment. Actionable
findings are reported for approval before editing. After approved fixes, rerun
local validation and the local CodeRabbit CLI review. When commit and push are
separately authorized, create one coherent fix commit, update the branch, and
wait for CI on the final head. Do not request another hosted Codex review
merely because the approved fixes changed the commit.

Each pull-request cycle is limited to one hosted Codex review, at most two local
CodeRabbit CLI runs, and at most one full local fallback. Approved findings
from that fallback receive targeted verification and the complete local gate
rather than another full review. Substantive new scope requires an explained,
user-approved new review cycle.

After GitHub accepts the hosted Codex review trigger, the agent reports the
pending review and stops. It does not wait or poll. Resume the workflow with a
new prompt after GitHub reports that Codex has finished.

When the final head is clean, ask before marking the draft ready for review or
merging. GitHub may trigger hosted Codex review when a draft becomes ready, so
do not post another manual review invocation at that transition.

When final CI passes, no review budget remains, and only explicit human actions
such as marking ready or merging remain, the readiness handoff also provides
resolved commands for the user to run after GitHub reports the pull request
merged:

```sh
git switch <base-branch>
git pull --ff-only <base-remote> <base-branch>
git branch -d <head-branch>
git fetch --prune <base-remote>
```

The branch is deleted before pruning so its remote-tracking reference can still
support safe deletion after a confirmed squash merge. A refused `-d` requires
inspection, not an automatic force deletion. Deleting a surviving remote branch
requires separate authorization.

### Optional Codex Cloud review

Hosted Codex review requires repository access, a per-repository Codex Cloud
environment, and Code review enabled for that repository. Configure it for
actively maintained repositories where cloud tasks or hosted Codex review are
useful; archived, local-only, or sensitive repositories may not need it.

Start with the universal image, no secrets, caching on, automatic setup, and
agent internet access off. Use the interactive terminal to run the repository's
complete validation command, then add only the setup or access it proves
necessary. Keep automatic reviews off when reviews should be requested
selectively.

Use the exact `@codex review` comment for the single review included with
requested pull-request creation. A commit, push, or update to an existing pull
request does not trigger another comment; the user owns any additional hosted
reviews. Do not place a live agent invocation in a pull-request title or body.
See
[Codex Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment.md),
[Codex in GitHub](https://learn.chatgpt.com/docs/third-party/github.md), and the
[Codex code review settings](https://chatgpt.com/codex/settings/code-review).

With automatic reviews off, GitHub does not request Codex review by itself.
This workflow posts the one manual review comment after an explicitly requested
pull-request creation. A later commit, push, or pull-request update receives no
additional trigger from the agent.

## Validation

Run the same deterministic gate used by CI:

```sh
./scripts/validate.sh
```

It checks required files, skill metadata and templates, the hosted Codex and
local CodeRabbit provider contract, private runtime state, shell syntax,
ShellCheck, Codex policy behavior, installer behavior, and working-tree and
staged whitespace. ShellCheck and Codex are optional locally with a notice; CI
requires both.

## Boundaries

The installer manages only instruction, skill, and Codex-rule symlinks plus
their manifests and backups. It does not manage credentials, sessions, plugins,
models, MCP servers, trust, permission profiles, `config.toml`, hooks,
deployment, or infrastructure.

The Codex policy allows documented low-risk inspection and validation commands.
It does not authorize Git mutations or publication. Commit, push, pull-request
creation or update, merge, installation, deployment, and infrastructure
actions each require explicit user intent.
