# Design decisions

Status: Accepted unless marked unresolved

## Repository role

- `ai-workflow` is a standalone repository.
- It owns reusable workflow, instructions, skills, adapters, installation, and
  validation.
- Product repositories own their requirements, commands, tests, and hazards.

## Multi-agent design

- Keep shared behavior agent-neutral.
- Support Codex and Claude Code first.
- Keep root `CLAUDE.md` as a thin route to root `AGENTS.md`.
- Use `.agents/skills/` as the canonical skill source.
- Verify discovery and installation for each agent.
- Add future agents through adapters instead of duplicating the workflow.

## Initial skills

- `ai-project-manager` combines repository document setup and phase planning.
- `pr-readiness` remains separate because publication and merge readiness have
  different triggers and authorization boundaries.
- `html-plan` creates derived HTML explanations for broad plans.
- Do not add a separate repository-structure skill initially.

## HTML plans

- Markdown remains the source of truth.
- Generate self-contained HTML without required network assets.
- Use the smallest useful visual form.
- Validate rendering when browser tooling is available.
- Skip HTML when prose or a short list is clearer.
- Retain generated HTML only when the user or project chooses an output path.
- Use the bundled validator for document structure and embedded resources.
- Treat browser inspection as manual evidence when browser tooling is
  available.

## Installation

- Linux is the first platform.
- The installer must support dry-run, backups, idempotence, and recovery.
- Tests use temporary home and agent-configuration directories.
- Bash is the first installer language.
- Copy is the stable default and link mode is explicit for local development.
- Rendered global instructions are always copied.
- The installer records targets, ownership, backups, and fingerprints in a
  current TSV manifest.
- Uninstall performs drift and path preflight before changing targets.

## Agent paths

- Codex global instructions install to `${CODEX_HOME:-$HOME/.codex}/AGENTS.md`.
- Codex user skills install to
  `${AGENTS_HOME:-$HOME/.agents}/skills/<skill-name>`.
- Claude instructions install to
  `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/CLAUDE.md`.
- Claude user skills install to
  `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/<skill-name>`.
- Source references and precedence notes live in `docs/AGENT-PATHS.md`.

## Portability

- Ubuntu 24.04, Debian 12, and Fedora 43 are the initial container baselines.
- Container tests prove the scripted Linux contract, not desktop integration
  or live agent discovery.

## Security

- Do not manage credentials, sessions, history, caches, logs, databases,
  plugins, connector state, broad trust, or broad runtime permissions.
- Do not install or authenticate external tools as hidden behavior.
- Keep commit, push, PR, merge, install, deploy, and apply explicit.

## Review and governance

- Use branches and pull requests for normal implementation.
- Add CI before requiring its check.
- Keep local validation and CI aligned.
- Use CodeRabbit as an available reviewer, not deterministic evidence.
- Stop local AI review after two passes when a repository does not set a
  smaller limit.
- Remote CodeRabbit is optional.
- Require exact evidence and explicit skipped checks.
- Pilot the workflow in Homelab before Nimbus and Dotfiles.

## Source reference

The structure is adapted from
[`ChrisTitusTech/titus-ai` at `a727824`](https://github.com/ChrisTitusTech/titus-ai/tree/a727824aa5c3a08ce99ba05932ebc79a18dcdda2).
It retains the document roles, skills model, validation evidence, and human
gates while using narrower permissions and a multi-agent core.
