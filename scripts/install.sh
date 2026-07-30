#!/usr/bin/env bash
set -eEuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="$repo_root"
install_mode="copy"
selected_agent="all"
dry_run=0

codex_home="${CODEX_HOME:-$HOME/.codex}"
agents_home="${AGENTS_HOME:-$HOME/.agents}"
claude_home="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
state_dir="${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}"

usage() {
  cat <<'EOF'
Usage: scripts/install.sh [options]

Options:
  --agent codex|claude|all  Components to install (default: all)
  --mode copy|link          Skill installation mode (default: copy)
  --source PATH             Repository source root
  --state-dir PATH          Manifest and backup directory
  --dry-run                 Print planned operations without changing targets
  -h, --help                Show this help

Environment overrides:
  CODEX_HOME, AGENTS_HOME, CLAUDE_CONFIG_DIR, AI_WORKFLOW_STATE_DIR,
  XDG_STATE_HOME
EOF
}

while (($#)); do
  case "$1" in
    --agent)
      [[ $# -ge 2 ]] || { printf 'error: --agent requires a value\n' >&2; exit 2; }
      selected_agent="$2"
      shift 2
      ;;
    --mode)
      [[ $# -ge 2 ]] || { printf 'error: --mode requires a value\n' >&2; exit 2; }
      install_mode="$2"
      shift 2
      ;;
    --source)
      [[ $# -ge 2 ]] || { printf 'error: --source requires a value\n' >&2; exit 2; }
      source_root="$2"
      shift 2
      ;;
    --state-dir)
      [[ $# -ge 2 ]] || { printf 'error: --state-dir requires a value\n' >&2; exit 2; }
      state_dir="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'error: unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$selected_agent" in codex|claude|all) ;; *)
  printf 'error: unsupported agent: %s\n' "$selected_agent" >&2
  exit 2
esac

case "$install_mode" in copy|link) ;; *)
  printf 'error: unsupported mode: %s\n' "$install_mode" >&2
  exit 2
esac

for required_command in awk cat cmp cp date diff find git grep ln mkdir mktemp mv readlink rm rmdir sha256sum sort; do
  command -v "$required_command" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$required_command" >&2
    exit 1
  }
done

source_root="$(readlink -f "$source_root")"
state_dir="$(readlink -m "$state_dir")"
codex_home="$(readlink -m "$codex_home")"
agents_home="$(readlink -m "$agents_home")"
claude_home="$(readlink -m "$claude_home")"

validate_path() {
  local value="$1"
  local label="$2"
  [[ "$value" == /* ]] || {
    printf 'error: %s must be absolute: %s\n' "$label" "$value" >&2
    exit 1
  }
  if LC_ALL=C printf '%s' "$value" | grep -q '[[:cntrl:]]'; then
    printf 'error: %s contains a control character\n' "$label" >&2
    exit 1
  fi
}

validate_path "$source_root" "source path"
validate_path "$state_dir" "state path"
validate_path "$codex_home" "Codex home"
validate_path "$agents_home" "agents home"
validate_path "$claude_home" "Claude home"

validate_managed_root() {
  local value="$1"
  local label="$2"
  [[ "$value" != "/" ]] || {
    printf 'error: %s cannot be the filesystem root\n' "$label" >&2
    exit 1
  }
}

validate_managed_root "$state_dir" "state path"
validate_managed_root "$codex_home" "Codex home"
validate_managed_root "$agents_home" "agents home"
validate_managed_root "$claude_home" "Claude home"

required_sources=(
  "$source_root/global/shared.md"
  "$source_root/global/adapters/codex.md"
  "$source_root/global/adapters/claude.md"
  "$source_root/.agents/skills"
)
for required_source in "${required_sources[@]}"; do
  [[ -e "$required_source" ]] || {
    printf 'error: missing source: %s\n' "$required_source" >&2
    exit 1
  }
done

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/ai-workflow-install.XXXXXXXX")"
rollback_dir="$work_dir/rollback"
render_dir="$work_dir/rendered"
mkdir -p "$rollback_dir" "$render_dir"

cleanup() {
  case "$work_dir" in
    "${TMPDIR:-/tmp}"/ai-workflow-install.*) rm -rf -- "$work_dir" ;;
    *) printf 'warning: refused unexpected cleanup path: %s\n' "$work_dir" >&2 ;;
  esac
}

declare -a changed_targets=()
declare -a restore_paths=()
declare -a restore_classes=()
install_complete=0

rollback() {
  local status=$?
  if [[ $install_complete -eq 0 && $dry_run -eq 0 ]]; then
    local index target restore_path restore_class
    for ((index=${#changed_targets[@]} - 1; index >= 0; index--)); do
      target="${changed_targets[$index]}"
      restore_path="${restore_paths[$index]}"
      restore_class="${restore_classes[$index]}"
      [[ ! -e "$target" && ! -L "$target" ]] || rm -rf -- "$target"
      if [[ "$restore_class" != "missing" && ( -e "$restore_path" || -L "$restore_path" ) ]]; then
        mkdir -p "$(dirname "$target")"
        mv -- "$restore_path" "$target"
      fi
    done
  fi
  cleanup
  exit "$status"
}
trap rollback ERR INT TERM
trap cleanup EXIT

render_instructions() {
  local agent="$1"
  local adapter="$source_root/global/adapters/$agent.md"
  local output="$render_dir/$agent.md"
  {
    printf '<!-- Generated by ai-workflow. Edit the source repository, not this file. -->\n\n'
    cat "$source_root/global/shared.md"
    printf '\n\n'
    cat "$adapter"
    printf '\n'
  } >"$output"
  printf '%s\n' "$output"
}

fingerprint_path() {
  local path="$1"
  if [[ -L "$path" ]]; then
    printf 'link\t%s\n' "$(readlink "$path")" | sha256sum | awk '{print $1}'
    return
  fi
  if [[ -f "$path" ]]; then
    sha256sum "$path" | awk '{print $1}'
    return
  fi
  if [[ -d "$path" ]]; then
    (
      cd "$path"
      while IFS= read -r -d '' relative; do
        if [[ -L "$relative" ]]; then
          printf 'link\t%s\t%s\n' "$relative" "$(readlink "$relative")"
        elif [[ -f "$relative" ]]; then
          printf 'file\t%s\t' "$relative"
          sha256sum "$relative" | awk '{print $1}'
        fi
      done < <(find . \( -type f -o -type l \) -print0 | LC_ALL=C sort -z)
    ) | sha256sum | awk '{print $1}'
    return
  fi
  printf '%s\n' "missing"
}

equivalent_target() {
  local source="$1"
  local target="$2"
  local mode="$3"
  if [[ "$mode" == "link" ]]; then
    [[ -L "$target" ]] || return 1
    [[ "$(readlink -f "$target")" == "$(readlink -f "$source")" ]]
  elif [[ -f "$source" ]]; then
    [[ -f "$target" && ! -L "$target" ]] && cmp -s "$source" "$target"
  else
    [[ -d "$target" && ! -L "$target" ]] && diff -qr "$source" "$target" >/dev/null
  fi
}

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="$state_dir/backups/$timestamp-$$"
manifest="$state_dir/current.tsv"
manifest_tmp="$work_dir/manifest.tsv"
processed_targets="$work_dir/processed-targets"
old_manifest=""
[[ -f "$manifest" ]] && old_manifest="$manifest"
: >"$processed_targets"

{
  printf '# ai-workflow-manifest-v1\n'
  printf 'meta\tinstalled_at\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'meta\tsource_root\t%s\n' "$source_root"
  printf 'meta\tmode\t%s\n' "$install_mode"
  printf 'meta\tagent\t%s\n' "$selected_agent"
  if git -C "$source_root" rev-parse --verify HEAD >/dev/null 2>&1; then
    printf 'meta\tcommit\t%s\n' "$(git -C "$source_root" rev-parse HEAD)"
  else
    printf 'meta\tcommit\tunknown\n'
  fi
} >"$manifest_tmp"

lookup_old_entry() {
  local target="$1"
  [[ -n "$old_manifest" ]] || return 1
  awk -F '\t' -v target="$target" '$1 == "entry" && $3 == target { print; exit }' "$old_manifest"
}

operation_count=0
changes=0
declare -a temporary_restores=()

install_target() {
  local agent="$1"
  local source="$2"
  local target="$3"
  local mode="$4"
  local manifest_source="${5:-$source}"
  local old_entry=""
  local old_ownership old_backup old_fingerprint
  local ownership backup fingerprint current_fingerprint

  validate_path "$target" "target path"
  if grep -Fqx -- "$target" "$processed_targets"; then
    printf 'error: more than one component resolves to target: %s\n' "$target" >&2
    return 1
  fi
  printf '%s\n' "$target" >>"$processed_targets"

  old_entry="$(lookup_old_entry "$target" || true)"
  if [[ -n "$old_entry" ]]; then
    old_ownership="$(awk -F '\t' '{print $6}' <<<"$old_entry")"
    old_backup="$(awk -F '\t' '{print $7}' <<<"$old_entry")"
    old_fingerprint="$(awk -F '\t' '{print $8}' <<<"$old_entry")"
  fi

  if equivalent_target "$source" "$target" "$mode"; then
    fingerprint="$(fingerprint_path "$target")"
    if [[ -n "$old_entry" ]]; then
      ownership="$old_ownership"
      backup="$old_backup"
    else
      ownership="external"
      backup="-"
    fi
    printf 'skip: %s\n' "$target"
    printf 'entry\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$agent" "$target" "$manifest_source" "$mode" "$ownership" "$backup" "$fingerprint" >>"$manifest_tmp"
    return
  fi

  if [[ $dry_run -eq 1 ]]; then
    if [[ -e "$target" || -L "$target" ]]; then
      printf 'replace: %s\n' "$target"
    else
      printf 'create: %s\n' "$target"
    fi
    return
  fi

  mkdir -p "$(dirname "$target")"
  local restore_path="$rollback_dir/$operation_count"
  local restore_class="missing"

  if [[ -e "$target" || -L "$target" ]]; then
    current_fingerprint="$(fingerprint_path "$target")"
    if [[ -n "$old_entry" && "$old_ownership" != "external" && "$current_fingerprint" == "$old_fingerprint" ]]; then
      ownership="$old_ownership"
      backup="$old_backup"
      restore_class="temporary"
      mv -- "$target" "$restore_path"
      temporary_restores+=("$restore_path")
      printf 'update: %s\n' "$target"
    else
      ownership="replaced"
      backup="$backup_root/${agent}${target}"
      mkdir -p "$(dirname "$backup")"
      restore_path="$backup"
      restore_class="backup"
      mv -- "$target" "$backup"
      printf 'backup: %s -> %s\n' "$target" "$backup"
    fi
  else
    ownership="created"
    backup="-"
    printf 'create: %s\n' "$target"
  fi

  changed_targets+=("$target")
  restore_paths+=("$restore_path")
  restore_classes+=("$restore_class")

  if [[ "$mode" == "link" ]]; then
    ln -s "$source" "$target"
  elif [[ -d "$source" ]]; then
    cp -a "$source" "$target"
  else
    cp -a "$source" "$target"
  fi

  fingerprint="$(fingerprint_path "$target")"
  printf 'entry\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$agent" "$target" "$manifest_source" "$mode" "$ownership" "$backup" "$fingerprint" >>"$manifest_tmp"

  operation_count=$((operation_count + 1))
  changes=$((changes + 1))
  if [[ -n "${AI_WORKFLOW_TEST_FAIL_AFTER:-}" && "$operation_count" -eq "$AI_WORKFLOW_TEST_FAIL_AFTER" ]]; then
    printf 'error: injected installer failure after %d operation(s)\n' "$operation_count" >&2
    return 97
  fi
}

install_agent() {
  local agent="$1"
  local rendered target skill_dir skill_name skill_target
  rendered="$(render_instructions "$agent")"

  if [[ "$agent" == "codex" ]]; then
    target="$codex_home/AGENTS.md"
  else
    target="$claude_home/CLAUDE.md"
  fi
  install_target \
    "$agent" \
    "$rendered" \
    "$target" \
    "copy" \
    "$source_root/global/shared.md+$source_root/global/adapters/$agent.md"

  for skill_dir in "$source_root"/.agents/skills/*; do
    [[ -d "$skill_dir" ]] || continue
    skill_name="$(basename "$skill_dir")"
    if [[ "$agent" == "codex" ]]; then
      skill_target="$agents_home/skills/$skill_name"
    else
      skill_target="$claude_home/skills/$skill_name"
    fi
    install_target "$agent" "$skill_dir" "$skill_target" "$install_mode"
  done
}

if [[ "$selected_agent" == "codex" || "$selected_agent" == "all" ]]; then
  install_agent "codex"
fi
if [[ "$selected_agent" == "claude" || "$selected_agent" == "all" ]]; then
  install_agent "claude"
fi

if [[ $dry_run -eq 1 ]]; then
  printf 'dry-run complete: no target or state files changed\n'
  install_complete=1
  exit 0
fi

# Retain ownership records that were outside this invocation's target set.
# This supports installing or updating Codex and Claude in separate commands
# and keeps removed source components recoverable by uninstall.
if [[ -n "$old_manifest" ]]; then
  awk -F '\t' '
    NR == FNR { processed[$0] = 1; next }
    $1 == "entry" && !($3 in processed) { print }
  ' "$processed_targets" "$old_manifest" >>"$manifest_tmp"
fi

mkdir -p "$state_dir"
if [[ $changes -eq 0 && -n "$old_manifest" ]]; then
  printf 'installation already current: %s\n' "$manifest"
else
  mv -- "$manifest_tmp" "$manifest"
  printf 'manifest: %s\n' "$manifest"
fi

install_complete=1
for temporary_restore in "${temporary_restores[@]}"; do
  if [[ -e "$temporary_restore" || -L "$temporary_restore" ]]; then
    if ! rm -rf -- "$temporary_restore"; then
      printf 'warning: could not remove rollback snapshot: %s\n' "$temporary_restore" >&2
    fi
  fi
done
if [[ -d "$backup_root" ]] && ! find "$backup_root" -mindepth 1 -print -quit | grep -q .; then
  if ! rmdir "$backup_root"; then
    printf 'warning: could not remove empty backup directory: %s\n' "$backup_root" >&2
  fi
fi

printf 'installation complete: agent=%s mode=%s changes=%d\n' \
  "$selected_agent" "$install_mode" "$changes"
