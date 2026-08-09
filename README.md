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
- `scripts/`: skill and runtime installation, uninstall, isolated tests, and
  validation
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
- `document-analysis`: combine canonical sources, LiteParse, native vision, and
  optional local OCR sidecars
- `local-pr-review`: provide an explicit or fallback review from a local checkout
- `passthrough`: audit and tighten a repository as a whole
- `pr-readiness`: prepare pull-request creation, updates, and merge-readiness checks
- `subagent`: delegate bounded independent work and return control for integration

Each workflow's `SKILL.md` is its source of truth. The project-manager skill
also provides optional `AGENTS.md`, `CLAUDE.md`, `SPEC.md`, `ROADMAP.md`, and
`TASKS.md` templates. Skills are selected from the current request; using one
does not keep it active for later unrelated work.

The unified `document-analysis` workflow uses LiteParse for born-digital text,
navigation, screenshots, and quick ordinary OCR. When approved native vision is
available, it uses rendered source pages for image-based mathematics, layout,
and direct structured authoring. PaddleOCR-VL and Chandra remain optional local
second readings; missing, slow, or workload-incompatible models do not block a
viable native-vision route. The rendered page remains authoritative. The skill
can author native Typst directly or convert verified Markdown through Pandoc. Its
[runtime and selection reference](.agents/skills/document-analysis/references/runtime-and-selection.md)
contains the research, current versions, hardware guidance, licenses, and
direct setup commands.

LiteParse requires Node.js 18 or later and package version 2.8 or later.
`scripts/install.sh` links the unified skill but does not install or update any
runtime.

Use the separate runtime installer only as an explicit user action. It checks
that each target command runs, checks the package-manager inventory when a
command is missing, validates Node.js and uv's executable path before changing
package state, repairs missing OCR extras in place, and skips complete working
installations:

```sh
./scripts/install-tools.sh --dry-run
./scripts/install-tools.sh
```

Install or inspect one runtime with `--tool liteparse`, `--tool paddleocr`, or
`--tool chandra`. The script requires an existing `npm` for LiteParse and an
existing `uv` for PaddleOCR and Chandra; it does not bootstrap package managers.
PDFs and images need no additional LiteParse converter. Office documents
require LibreOffice.

The default installs PaddleOCR's portable CPU engine when the tool is absent.
On a Linux x86_64 NVIDIA host, explicitly select the GPU engine after checking
the preview:

```sh
./scripts/install-tools.sh --tool paddleocr --accelerator nvidia --dry-run
./scripts/install-tools.sh --tool paddleocr --accelerator nvidia
```

This requires a working `nvidia-smi`. It selects PaddlePaddle's CUDA 12.6 wheel
for driver 550.54.14 or later and its CUDA 11.8 wheel for driver 450.80.02 or
later, then verifies that the isolated runtime sees a CUDA device. An explicit
NVIDIA selection also requires GPU 0 compute capability 7.0 or later and
rebuilds an existing uv-managed CPU PaddleOCR environment. It retains that
environment until the replacement passes its CUDA check and restores it if the
replacement fails. A normal run still preserves a working accelerator-specific
environment.

The runtime installer puts PaddleOCR and Chandra in separate `uv` tool
environments so their Python dependencies do not conflict. After inspecting all
selected tools, it installs only missing uv tools and runs up to two independent
tool installations concurrently. Set another positive limit with `--jobs`.
One `uv tool install` accepts one root package, so the script uses parallel
commands rather than combining unrelated OCR stacks into one environment. It
installs the local Hugging Face dependencies for Chandra but does not download
OCR model weights; the first inference remains a separate network and disk
change.

In-place repair uses `uv pip install --python` inside the existing tool
environment. It adds `python-docx` to PaddleOCR or the Hugging Face dependencies
to Chandra without recreating the environment, so an existing CUDA or other
accelerator-specific PaddlePaddle build is preserved. A later `uv tool upgrade`
may reconstruct the environment from its original receipt, which cannot record
the separately sourced NVIDIA engine. After a deliberate upgrade, rerun this
installer with `--tool paddleocr --accelerator nvidia`; it detects and safely
reinserts a missing engine.

Before skipping or repairing a uv-managed PaddleOCR environment, the installer
also verifies that its PaddlePaddle engine imports successfully. The CPU route
stops if the engine is absent or broken. The explicit NVIDIA route can rebuild
that uv-managed environment with the selected GPU engine; it is never inferred
merely because a GPU happens to be visible.

"Global" here means available from every repository through the user's
`PATH`, not installed into each project or the system Python. LiteParse uses the
active npm global prefix; the OCR packages use uv's user-level tool directory
and executable directory. Inspect those locations with:

```sh
npm prefix --global
uv tool dir
uv tool dir --bin
```

The equivalent direct commands are:

```sh
npm install --global '@llamaindex/liteparse@^2.8'
uv tool install --python 3.12 \
  --with 'paddlepaddle>=3.3,<4' \
  --with 'python-docx>=1.1,<2' \
  'paddleocr[doc-parser]>=3.7,<4'
uv tool install --python 3.12 'chandra-ocr[hf]==0.2.0'
liteparse --help
paddleocr doc_parser --help
chandra --help
pandoc --version
```

Chandra's Hugging Face path installs a large PyTorch stack and later downloads
5B model weights. The supported NVIDIA PaddleOCR path and other
accelerator-specific guidance are documented in the skill reference. Neither
runtime installation path downloads OCR model weights. The NVIDIA installer
resolves PaddleOCR from PyPI before resolving only `paddlepaddle-gpu` against
the official CUDA index, keeping uv's safe `first-index` strategy throughout.

Remove the independently managed runtimes separately from the skill links:

```sh
npm uninstall -g @llamaindex/liteparse
uv tool uninstall paddleocr
uv tool uninstall chandra-ocr
```

The installer accepts a supported LiteParse 2.8 or later installation without
contacting npm for upgrades. To deliberately update within the supported 2.x
line, run:

```sh
npm install --global '@llamaindex/liteparse@^2.8'
```

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

Editing files inside an already linked skill needs no reinstall; the symlink
still points to that directory. After adding, renaming, or removing a canonical
skill, rerun the installer with pruning so each agent receives new links and
obsolete links owned by this repository are removed:

```sh
./scripts/install.sh --prune --dry-run
./scripts/install.sh --prune
```

The installer discovers every directory under `.agents/skills`. It includes an
explicit migration from the old `liteparse` skill name to `document-analysis`:
it creates the new link, removes the old managed link, and restores any file or
link that had been backed up at the old target. Other removed skills require
`--prune`; without it, installation stops and explains the stale managed link.

Pruning is manifest-scoped. It removes or restores only skill targets previously
recorded by this repository's installer. Skills installed independently in
`~/.agents/skills` or `~/.claude/skills` are not in that manifest and remain
untouched. Always inspect the dry run before pruning.

`CODEX_HOME`, `AGENTS_HOME`, and `CLAUDE_CONFIG_DIR` override the default
targets. Tests and controlled installations may also use
`AI_WORKFLOW_STATE_DIR`, `--source`, or `--state-dir`.

`scripts/install-tools.sh` is intentionally independent of this manifest. It
manages user-level runtime packages, while `scripts/install.sh` and
`scripts/uninstall.sh` manage only repository-owned links and backups.

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
staged whitespace. It also runs the standard-library-only Python tests for the
PaddleOCR and Chandra CUDA helpers, so `python3` must be on `PATH`. ShellCheck
and Codex are optional locally with a notice; CI requires both.

## Boundaries

The installer manages only instruction, skill, and Codex-rule symlinks plus
their manifests and backups. It does not manage credentials, sessions, plugins,
models, MCP servers, trust, permission profiles, `config.toml`, hooks,
deployment, or infrastructure.

The Codex policy allows documented low-risk inspection and validation commands.
It does not authorize Git mutations or publication. Commit, push, pull-request
creation or update, merge, installation, deployment, and infrastructure
actions each require explicit user intent.
