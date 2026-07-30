#!/usr/bin/env bash
set -euo pipefail

selected_agent="all"
dry_run=0
state_dir="${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}"
codex_home="${CODEX_HOME:-$HOME/.codex}"
agents_home="${AGENTS_HOME:-$HOME/.agents}"
claude_home="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

usage() {
  cat <<'EOF'
Usage: scripts/uninstall.sh [options]

  --agent codex|claude|all  Agent to uninstall (default: all)
  --state-dir PATH          Manifest and backup directory
  --dry-run                 Preview without changing targets
  -h, --help                Show this help
EOF
}

require_value() {
  local option="$1" argument_count="$2"
  ((argument_count >= 2)) || {
    printf 'error: %s requires a value\n' "$option" >&2
    usage >&2
    exit 2
  }
}

while (($#)); do
  case "$1" in
    --agent) require_value "$1" "$#"; selected_agent="$2"; shift 2 ;;
    --state-dir) require_value "$1" "$#"; state_dir="$2"; shift 2 ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'error: unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$selected_agent" in codex|claude|all) ;; *)
  printf 'error: unsupported agent: %s\n' "$selected_agent" >&2
  exit 2
esac

for command_name in dirname grep head mkdir mv readlink rm; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$command_name" >&2
    exit 1
  }
done

state_dir="$(readlink -m "$state_dir")"
codex_home="$(readlink -m "$codex_home")"
agents_home="$(readlink -m "$agents_home")"
claude_home="$(readlink -m "$claude_home")"

for path in "$state_dir" "$codex_home" "$agents_home" "$claude_home"; do
  [[ "$path" == /* && "$path" != "/" ]] || {
    printf 'error: managed paths must be absolute and non-root\n' >&2
    exit 1
  }
done

valid_manifest_target() {
  local agent="$1" target="$2" skill_root skill_name
  case "$agent:$target" in
    "codex:$codex_home/AGENTS.md"|\
    "codex:$codex_home/rules/ai-workflow.rules"|\
    "claude:$claude_home/CLAUDE.md") return 0 ;;
  esac
  if [[ "$agent" == "codex" ]]; then
    skill_root="$agents_home/skills/"
  else
    skill_root="$claude_home/skills/"
  fi
  skill_name="${target##*/}"
  [[ -n "$skill_name" && "$skill_name" != "." && "$skill_name" != ".." &&
    "$target" == "$skill_root$skill_name" ]]
}

valid_manifest_backup() {
  local agent="$1" backup="$2" leaf parent
  [[ "$backup" == "-" ]] && return 0
  leaf="${backup##*/}"
  parent="${backup%/*}"
  [[ "$leaf" =~ ^[0-9]+$ &&
    "${parent%/*}" == "$state_dir/backups" &&
    "${parent##*/}" == "$agent-"* ]]
}

if [[ "$selected_agent" == "all" ]]; then
  agents=(codex claude)
else
  agents=("$selected_agent")
fi

found=0
for agent in "${agents[@]}"; do
  manifest="$state_dir/$agent.tsv"
  [[ -f "$manifest" ]] || continue
  found=1
  head -n 1 "$manifest" | grep -qx '# ai-workflow-manifest-v1' || {
    printf 'error: unsupported manifest: %s\n' "$manifest" >&2
    exit 1
  }
  while IFS=$'\t' read -r record target backup installed_source; do
    [[ "$record" == "entry" ]] || continue
    valid_manifest_target "$agent" "$target" || {
      printf 'error: unsafe manifest target: %s\n' "$target" >&2
      exit 1
    }
    if [[ "$backup" != "-" ]]; then
      valid_manifest_backup "$agent" "$backup" || {
        printf 'error: unsafe backup path: %s\n' "$backup" >&2
        exit 1
      }
      if [[ ! -e "$backup" && ! -L "$backup" ]]; then
        if [[ -e "$target" && ! -L "$target" ]]; then
          continue
        fi
        printf 'error: missing backup: %s\n' "$backup" >&2
        exit 1
      fi
    fi
    if [[ -e "$target" || -L "$target" ]]; then
      [[ -L "$target" && "$(readlink "$target")" == "$installed_source" ]] || {
        printf 'error: managed link changed: %s\n' "$target" >&2
        exit 1
      }
    fi
  done <"$manifest"
done

[[ $found -eq 1 ]] || {
  printf 'error: no installation manifest found\n' >&2
  exit 1
}

for agent in "${agents[@]}"; do
  manifest="$state_dir/$agent.tsv"
  [[ -f "$manifest" ]] || continue
  while IFS=$'\t' read -r record target backup _; do
    [[ "$record" == "entry" ]] || continue
    if [[ "$backup" != "-" &&
      ! -e "$backup" && ! -L "$backup" &&
      -e "$target" && ! -L "$target" ]]; then
      printf 'already restored: %s\n' "$target"
      continue
    fi
    if [[ "$backup" == "-" && ! -e "$target" && ! -L "$target" ]]; then
      printf 'already removed: %s\n' "$target"
      continue
    fi
    if [[ $dry_run -eq 1 ]]; then
      if [[ "$backup" == "-" ]]; then
        printf 'remove: %s\n' "$target"
      else
        printf 'restore: %s <- %s\n' "$target" "$backup"
      fi
      continue
    fi
    [[ ! -e "$target" && ! -L "$target" ]] || rm -- "$target"
    if [[ "$backup" != "-" ]]; then
      mkdir -p "$(dirname "$target")"
      mv -- "$backup" "$target"
      printf 'restored: %s\n' "$target"
    else
      printf 'removed: %s\n' "$target"
    fi
  done <"$manifest"
  [[ $dry_run -eq 1 ]] || rm -- "$manifest"
done

if [[ $dry_run -eq 1 ]]; then
  printf 'dry-run complete: no files changed\n'
else
  printf 'uninstall complete: %s\n' "$selected_agent"
fi
