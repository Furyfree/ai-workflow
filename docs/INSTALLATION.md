# Installation

The Linux installer manages global instructions and the three canonical skills
for Codex, Claude Code, or both.

It does not install or authenticate either agent.

## Requirements

Installation requires Bash and common Linux utilities including `sha256sum`,
`find`, `sort`, `readlink`, and `git`.

Repository validation additionally requires Python 3. CI requires ShellCheck.

## Preview

Preview the default copy installation:

```sh
./scripts/install.sh --dry-run
```

Preview one agent or link mode:

```sh
./scripts/install.sh --agent codex --mode link --dry-run
./scripts/install.sh --agent claude --mode copy --dry-run
```

Dry-run may use a temporary working directory but does not create target agent
homes, backups, or installation state.

## Install

The stable default copies skills:

```sh
./scripts/install.sh --agent all --mode copy
```

Link mode is intended for developing this repository locally:

```sh
./scripts/install.sh --agent all --mode link
```

Rendered global instruction files are always copied because they combine the
shared source with an agent adapter.

## Target overrides

The installer respects:

- `CODEX_HOME`
- `AGENTS_HOME`
- `CLAUDE_CONFIG_DIR`
- `AI_WORKFLOW_STATE_DIR`
- `XDG_STATE_HOME`

It also accepts `--source` and `--state-dir`. All managed paths must resolve to
absolute paths without control characters. Agent homes and the state directory
cannot be the filesystem root.

## Manifest and backups

The current machine-readable manifest is:

```text
${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}/current.tsv
```

It records the source commit, selected agents, installation mode, targets,
ownership, backups, and installed fingerprints.

Conflicting targets are moved into a timestamped directory under
`state/backups/`. Equivalent unmanaged targets are recorded as external and
are not removed by uninstall.

Repeated installation preserves the existing manifest when no content changed.
Managed updates keep their original recovery information. An interrupted
installation rolls back completed target mutations. Agent-specific runs merge
with ownership records from earlier runs, so installing or updating one agent
does not orphan the other agent's managed files.

## Remove or restore

Preview removal:

```sh
./scripts/uninstall.sh --dry-run
```

Remove managed files and restore recorded conflicts:

```sh
./scripts/uninstall.sh
```

Uninstall performs a complete preflight before mutation. It refuses targets
whose fingerprints changed after installation and rejects manifest paths
outside the supported agent homes and state backup directory.

Successful uninstall archives the manifest under `state/history/`.

## Validation

Installer tests use temporary homes:

```sh
./scripts/test-install.sh
```

They cover copy and link modes, backups, equivalent targets, idempotence,
updates, injected rollback, dry-run, drift refusal, uninstall, paths with
spaces, and agent-specific target layouts.

The tests never use the real Codex or Claude configuration directories.
