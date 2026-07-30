#!/usr/bin/env bash
set -eEuo pipefail

dry_run=0
state_dir="${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}"
manifest=""

usage() {
  cat <<'EOF'
Usage: scripts/uninstall.sh [options]

Options:
  --manifest PATH   Manifest to remove (default: STATE_DIR/current.tsv)
  --state-dir PATH  Manifest and backup directory
  --dry-run         Print planned operations without changing targets
  -h, --help        Show this help
EOF
}

while (($#)); do
  case "$1" in
    --manifest)
      [[ $# -ge 2 ]] || { printf 'error: --manifest requires a value\n' >&2; exit 2; }
      manifest="$2"
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
      exit 2
      ;;
  esac
done

for required_command in date find mkdir mktemp mv readlink rm sha256sum sort; do
  command -v "$required_command" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$required_command" >&2
    exit 1
  }
done

state_dir="$(readlink -m "$state_dir")"
manifest="${manifest:-$state_dir/current.tsv}"
manifest="$(readlink -m "$manifest")"
[[ "$state_dir" != "/" ]] || {
  printf 'error: state path cannot be the filesystem root\n' >&2
  exit 1
}
[[ -f "$manifest" ]] || {
  printf 'error: manifest not found: %s\n' "$manifest" >&2
  exit 1
}
head -n 1 "$manifest" | grep -qx '# ai-workflow-manifest-v1' || {
  printf 'error: unsupported manifest: %s\n' "$manifest" >&2
  exit 1
}

codex_home="$(readlink -m "${CODEX_HOME:-$HOME/.codex}")"
agents_home="$(readlink -m "${AGENTS_HOME:-$HOME/.agents}")"
claude_home="$(readlink -m "${CLAUDE_CONFIG_DIR:-$HOME/.claude}")"
for managed_root in "$codex_home" "$agents_home" "$claude_home"; do
  [[ "$managed_root" != "/" ]] || {
    printf 'error: an agent home cannot be the filesystem root\n' >&2
    exit 1
  }
done

allowed_target() {
  local target="$1"
  case "$target" in
    "$codex_home"/*|"$agents_home"/*|"$claude_home"/*) return 0 ;;
    *) return 1 ;;
  esac
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

errors=0
entry_count=0
while IFS=$'\t' read -r record _ target _ _ ownership backup fingerprint; do
  [[ "$record" == "entry" ]] || continue
  entry_count=$((entry_count + 1))
  if ! allowed_target "$target"; then
    printf 'error: manifest target is outside supported homes: %s\n' "$target" >&2
    errors=$((errors + 1))
    continue
  fi
  if [[ "$backup" != "-" ]]; then
    case "$backup" in "$state_dir"/backups/*) ;; *)
      printf 'error: manifest backup is outside state directory: %s\n' "$backup" >&2
      errors=$((errors + 1))
    esac
  fi
  [[ "$ownership" != "external" ]] || continue
  if [[ -e "$target" || -L "$target" ]]; then
    current_fingerprint="$(fingerprint_path "$target")"
    if [[ "$current_fingerprint" != "$fingerprint" ]]; then
      printf 'error: managed target changed since installation: %s\n' "$target" >&2
      errors=$((errors + 1))
    fi
  fi
  if [[ "$ownership" == "replaced" && ! -e "$backup" && ! -L "$backup" ]]; then
    printf 'error: required backup is missing: %s\n' "$backup" >&2
    errors=$((errors + 1))
  fi
done <"$manifest"

[[ $entry_count -gt 0 ]] || {
  printf 'error: manifest contains no entries\n' >&2
  exit 1
}
[[ $errors -eq 0 ]] || exit 1

if [[ $dry_run -eq 1 ]]; then
  while IFS=$'\t' read -r record _ target _ _ ownership backup _; do
    [[ "$record" == "entry" && "$ownership" != "external" ]] || continue
    if [[ "$ownership" == "replaced" ]]; then
      printf 'restore: %s <- %s\n' "$target" "$backup"
    else
      printf 'remove: %s\n' "$target"
    fi
  done <"$manifest"
  printf 'dry-run complete: no target or state files changed\n'
  exit 0
fi

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/ai-workflow-uninstall.XXXXXXXX")"
declare -a targets=()
declare -a installed_rollbacks=()
declare -a restored_backups=()
complete=0

cleanup() {
  case "$work_dir" in
    "${TMPDIR:-/tmp}"/ai-workflow-uninstall.*) rm -rf -- "$work_dir" ;;
    *) printf 'warning: refused unexpected cleanup path: %s\n' "$work_dir" >&2 ;;
  esac
}

rollback() {
  local status=$?
  if [[ $complete -eq 0 ]]; then
    local index target installed_rollback restored_backup
    for ((index=${#targets[@]} - 1; index >= 0; index--)); do
      target="${targets[$index]}"
      installed_rollback="${installed_rollbacks[$index]}"
      restored_backup="${restored_backups[$index]}"
      if [[ "$restored_backup" != "-" && ( -e "$target" || -L "$target" ) ]]; then
        mkdir -p "$(dirname "$restored_backup")"
        mv -- "$target" "$restored_backup"
      fi
      if [[ -e "$installed_rollback" || -L "$installed_rollback" ]]; then
        mkdir -p "$(dirname "$target")"
        mv -- "$installed_rollback" "$target"
      fi
    done
  fi
  cleanup
  exit "$status"
}
trap rollback ERR INT TERM
trap cleanup EXIT

index=0
while IFS=$'\t' read -r record _ target _ _ ownership backup _; do
  [[ "$record" == "entry" && "$ownership" != "external" ]] || continue
  installed_rollback="$work_dir/$index"
  if [[ -e "$target" || -L "$target" ]]; then
    mv -- "$target" "$installed_rollback"
  fi
  restored_backup="-"
  if [[ "$ownership" == "replaced" ]]; then
    mkdir -p "$(dirname "$target")"
    mv -- "$backup" "$target"
    restored_backup="$backup"
    printf 'restored: %s\n' "$target"
  else
    printf 'removed: %s\n' "$target"
  fi
  targets+=("$target")
  installed_rollbacks+=("$installed_rollback")
  restored_backups+=("$restored_backup")
  index=$((index + 1))
done <"$manifest"

history_dir="$state_dir/history"
mkdir -p "$history_dir"
archived_manifest="$history_dir/$(date -u +%Y%m%dT%H%M%SZ)-$$-uninstalled.tsv"
mv -- "$manifest" "$archived_manifest"

complete=1
printf 'uninstall complete: manifest archived at %s\n' "$archived_manifest"
