#!/usr/bin/env bash
# Trap callbacks are invoked indirectly.
# shellcheck disable=SC2317,SC2329
set -eEuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="$repo_root"
selected_agent="all"
dry_run=0
prune=0
state_dir="${AI_WORKFLOW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ai-workflow}"
codex_home="${CODEX_HOME:-$HOME/.codex}"
agents_home="${AGENTS_HOME:-$HOME/.agents}"
claude_home="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

usage() {
  cat <<'EOF'
Usage: scripts/install.sh [options]

  --agent codex|claude|all  Agent to install (default: all)
  --source PATH             Repository source root
  --state-dir PATH          Manifest and backup directory
  --prune                   Remove obsolete skills managed by this installer
  --dry-run                 Preview without changing agent homes or state
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
    --source) require_value "$1" "$#"; source_root="$2"; shift 2 ;;
    --state-dir) require_value "$1" "$#"; state_dir="$2"; shift 2 ;;
    --prune) prune=1; shift ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'error: unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$selected_agent" in codex|claude|all) ;; *)
  printf 'error: unsupported agent: %s\n' "$selected_agent" >&2
  exit 2
esac

for command_name in \
  awk basename cat cmp date dirname grep head ln mkdir mktemp mv readlink rm; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$command_name" >&2
    exit 1
  }
done

source_root="$(readlink -f "$source_root")"
state_dir="$(readlink -m "$state_dir")"
codex_home="$(readlink -m "$codex_home")"
agents_home="$(readlink -m "$agents_home")"
claude_home="$(readlink -m "$claude_home")"

validate_path() {
  local value="$1" label="$2"
  [[ "$value" == /* && "$value" != "/" ]] || {
    printf 'error: %s must be an absolute non-root path\n' "$label" >&2
    exit 1
  }
  if LC_ALL=C printf '%s' "$value" | grep -q '[[:cntrl:]]'; then
    printf 'error: %s contains a control character\n' "$label" >&2
    exit 1
  fi
}

validate_path "$source_root" "source"
validate_path "$state_dir" "state directory"
validate_path "$codex_home" "Codex home"
validate_path "$agents_home" "agents home"
validate_path "$claude_home" "Claude home"

for required in \
  codex/rules/ai-workflow.rules \
  global/shared.md \
  .agents/skills/ai-project-manager/SKILL.md \
  .agents/skills/document-analysis/SKILL.md \
  .agents/skills/html-plan/SKILL.md \
  .agents/skills/local-pr-review/SKILL.md \
  .agents/skills/passthrough/SKILL.md \
  .agents/skills/pr-readiness/SKILL.md \
  .agents/skills/subagent/SKILL.md; do
  [[ -f "$source_root/$required" ]] || {
    printf 'error: missing source: %s\n' "$required" >&2
    exit 1
  }
done

same_link() {
  local source="$1" target="$2"
  [[ -L "$target" ]] || return 1
  [[ "$(readlink -f "$target")" == "$(readlink -f "$source")" ]]
}

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

install_agent() (
  set -eEuo pipefail
  local agent="$1"
  local manifest="$state_dir/$agent.tsv"
  local work_dir backup_root manifest_tmp processed
  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/ai-workflow-install.XXXXXXXX")"
  backup_root="$state_dir/backups/$agent-$(date -u +%Y%m%dT%H%M%SZ)-$$"
  manifest_tmp="$work_dir/manifest.tsv"
  processed="$work_dir/processed"
  : >"$processed"
  printf '# ai-workflow-manifest-v1\n' >"$manifest_tmp"

  cleanup() {
    case "$work_dir" in
      "${TMPDIR:-/tmp}"/ai-workflow-install.*) rm -rf -- "$work_dir" ;;
    esac
  }

  local -a changed_targets=() restore_paths=() restore_kinds=()
  local -a removed_targets=() removed_backups=() removed_sources=()
  local -a removed_had_targets=() removed_restored_backups=()
  local complete=0
  rollback() {
    local status=$? index target restore kind backup source
    local had_target restored_backup
    if [[ $complete -eq 0 && $dry_run -eq 0 ]]; then
      for ((index=${#removed_targets[@]} - 1; index >= 0; index--)); do
        target="${removed_targets[$index]}"
        backup="${removed_backups[$index]}"
        source="${removed_sources[$index]}"
        had_target="${removed_had_targets[$index]}"
        restored_backup="${removed_restored_backups[$index]}"
        if [[ "$restored_backup" -eq 1 &&
          ( -e "$target" || -L "$target" ) ]]; then
          mkdir -p "$(dirname "$backup")"
          mv -- "$target" "$backup"
        fi
        if [[ "$had_target" -eq 1 ]]; then
          [[ ! -e "$target" && ! -L "$target" ]] || rm -- "$target"
          mkdir -p "$(dirname "$target")"
          ln -s -- "$source" "$target"
        fi
      done
      for ((index=${#changed_targets[@]} - 1; index >= 0; index--)); do
        target="${changed_targets[$index]}"
        restore="${restore_paths[$index]}"
        kind="${restore_kinds[$index]}"
        [[ ! -e "$target" && ! -L "$target" ]] || rm -- "$target"
        if [[ "$kind" != "missing" && ( -e "$restore" || -L "$restore" ) ]]; then
          mkdir -p "$(dirname "$target")"
          mv -- "$restore" "$target"
        fi
      done
    fi
    exit "$status"
  }
  trap rollback ERR INT TERM
  trap cleanup EXIT

  if [[ -f "$manifest" ]]; then
    head -n 1 "$manifest" | grep -qx '# ai-workflow-manifest-v1' || {
      printf 'error: unsupported manifest: %s\n' "$manifest" >&2
      return 1
    }
    while IFS=$'\t' read -r record target backup installed_source; do
      [[ "$record" == "entry" ]] || continue
      valid_manifest_target "$agent" "$target" || {
        printf 'error: unsafe manifest target: %s\n' "$target" >&2
        return 1
      }
      if [[ -e "$target" || -L "$target" ]]; then
        [[ -L "$target" && "$(readlink "$target")" == "$installed_source" ]] || {
          printf 'error: managed link changed: %s\n' "$target" >&2
          return 1
        }
      fi
      if [[ "$backup" != "-" ]]; then
        valid_manifest_backup "$agent" "$backup" || {
          printf 'error: unsafe backup path: %s\n' "$backup" >&2
          return 1
        }
        [[ -e "$backup" || -L "$backup" ]] || {
          printf 'error: missing backup: %s\n' "$backup" >&2
          return 1
        }
      fi
    done <"$manifest"
  fi

  local index=0
  install_target() {
    local source="$1" target="$2"
    local old_entry="" old_backup="-" old_source=""
    local backup="-" restore="$work_dir/restore-$index" kind="missing"
    printf '%s\n' "$target" >>"$processed"
    if [[ -f "$manifest" ]]; then
      old_entry="$(awk -F '\t' -v target="$target" \
        '$1 == "entry" && $2 == target { print; exit }' "$manifest")"
    fi
    if [[ -n "$old_entry" ]]; then
      old_backup="$(awk -F '\t' '{print $3}' <<<"$old_entry")"
      old_source="$(awk -F '\t' '{print $4}' <<<"$old_entry")"
    fi

    if same_link "$source" "$target"; then
      printf 'skip: %s\n' "$target"
      if [[ -n "$old_entry" ]]; then
        printf 'entry\t%s\t%s\t%s\n' "$target" "$old_backup" "$old_source" \
          >>"$manifest_tmp"
      else
        printf 'entry\t%s\t-\t%s\n' "$target" "$(readlink "$target")" \
          >>"$manifest_tmp"
      fi
      index=$((index + 1))
      return
    fi

    if [[ $dry_run -eq 1 ]]; then
      if [[ -n "$old_entry" ]]; then
        printf 'update link: %s -> %s\n' "$target" "$source"
      elif [[ -e "$target" || -L "$target" ]]; then
        printf 'replace: %s -> %s\n' "$target" "$source"
      else
        printf 'link: %s -> %s\n' "$target" "$source"
      fi
      index=$((index + 1))
      return
    fi

    mkdir -p "$(dirname "$target")"
    if [[ -n "$old_entry" ]]; then
      backup="$old_backup"
      if [[ -e "$target" || -L "$target" ]]; then
        mv -- "$target" "$restore"
        kind="temporary"
      fi
      printf 'update link: %s -> %s\n' "$target" "$source"
    elif [[ -e "$target" || -L "$target" ]]; then
      backup="$backup_root/$index"
      mkdir -p "$(dirname "$backup")"
      mv -- "$target" "$backup"
      restore="$backup"
      kind="backup"
      printf 'backup: %s -> %s\n' "$target" "$backup"
    else
      printf 'link: %s -> %s\n' "$target" "$source"
    fi

    changed_targets+=("$target")
    restore_paths+=("$restore")
    restore_kinds+=("$kind")
    ln -s -- "$source" "$target"
    printf 'entry\t%s\t%s\t%s\n' "$target" "$backup" "$source" >>"$manifest_tmp"
    index=$((index + 1))
  }

  install_entry_path() {
    local path="$1"
    printf '%s/%s\n' \
      "$(readlink -m "$(dirname "$path")")" "$(basename "$path")"
  }

  validate_install_pair() {
    local source="$1" target="$2"
    [[ "$(install_entry_path "$source")" != \
      "$(install_entry_path "$target")" ]] || {
      printf 'error: install target aliases source: %s\n' "$target" >&2
      return 1
    }
  }

  local instruction_target skill_dir skill_target plan_index
  local -a install_sources=() install_targets=()
  if [[ "$agent" == "codex" ]]; then
    instruction_target="$codex_home/AGENTS.md"
  else
    instruction_target="$claude_home/CLAUDE.md"
  fi
  install_sources+=("$source_root/global/shared.md")
  install_targets+=("$instruction_target")
  if [[ "$agent" == "codex" ]]; then
    install_sources+=("$source_root/codex/rules/ai-workflow.rules")
    install_targets+=("$codex_home/rules/ai-workflow.rules")
  fi

  for skill_dir in "$source_root"/.agents/skills/*; do
    [[ -d "$skill_dir" ]] || continue
    if [[ "$agent" == "codex" ]]; then
      skill_target="$agents_home/skills/$(basename "$skill_dir")"
    else
      skill_target="$claude_home/skills/$(basename "$skill_dir")"
    fi
    install_sources+=("$skill_dir")
    install_targets+=("$skill_target")
  done

  for ((plan_index=0; plan_index<${#install_sources[@]}; plan_index++)); do
    validate_install_pair \
      "${install_sources[$plan_index]}" "${install_targets[$plan_index]}"
  done
  for ((plan_index=0; plan_index<${#install_sources[@]}; plan_index++)); do
    install_target \
      "${install_sources[$plan_index]}" "${install_targets[$plan_index]}"
  done

  known_skill_rename() {
    local target="$1" skill_root
    if [[ "$agent" == "codex" ]]; then
      skill_root="$agents_home/skills"
    else
      skill_root="$claude_home/skills"
    fi
    [[ "$target" == "$skill_root/liteparse" &&
      -d "$source_root/.agents/skills/document-analysis" ]]
  }

  managed_skill_target() {
    local target="$1" skill_root
    if [[ "$agent" == "codex" ]]; then
      skill_root="$agents_home/skills/"
    else
      skill_root="$claude_home/skills/"
    fi
    [[ "$target" == "$skill_root${target##*/}" ]]
  }

  remove_managed_target() {
    local target="$1" backup="$2" installed_source="$3" label="$4"
    local had_target=0 restored_backup=0
    [[ ! -e "$target" && ! -L "$target" ]] || had_target=1
    [[ "$backup" == "-" ]] || restored_backup=1

    if [[ $dry_run -eq 1 ]]; then
      if [[ $restored_backup -eq 1 ]]; then
        printf 'restore %s target: %s <- %s\n' "$label" "$target" "$backup"
      else
        printf 'remove %s link: %s\n' "$label" "$target"
      fi
      return
    fi

    removed_targets+=("$target")
    removed_backups+=("$backup")
    removed_sources+=("$installed_source")
    removed_had_targets+=("$had_target")
    removed_restored_backups+=("$restored_backup")

    [[ $had_target -eq 0 ]] || rm -- "$target"
    if [[ $restored_backup -eq 1 ]]; then
      mkdir -p "$(dirname "$target")"
      mv -- "$backup" "$target"
      printf 'restored %s target: %s\n' "$label" "$target"
    else
      printf 'removed %s link: %s\n' "$label" "$target"
    fi
  }

  if [[ -f "$manifest" ]]; then
    while IFS=$'\t' read -r record target backup installed_source; do
      [[ "$record" == "entry" ]] || continue
      if grep -Fqx -- "$target" "$processed"; then
        continue
      fi
      if known_skill_rename "$target"; then
        remove_managed_target \
          "$target" "$backup" "$installed_source" "renamed"
      elif [[ $prune -eq 1 ]] && managed_skill_target "$target"; then
        remove_managed_target \
          "$target" "$backup" "$installed_source" "pruned"
      elif managed_skill_target "$target"; then
        printf 'error: managed skill was removed; rerun with --prune: %s\n' \
          "$target" >&2
        return 1
      else
        printf 'error: managed component was removed; uninstall %s first: %s\n' \
          "$agent" "$target" >&2
        return 1
      fi
    done <"$manifest"
  fi

  if [[ $dry_run -eq 1 ]]; then
    complete=1
    return
  fi

  mkdir -p "$state_dir"
  if [[ -f "$manifest" ]] && cmp -s "$manifest_tmp" "$manifest"; then
    printf 'installation already current: %s\n' "$agent"
  else
    mv -- "$manifest_tmp" "$manifest"
    printf 'manifest: %s\n' "$manifest"
  fi
  complete=1
  if ((${#restore_paths[@]})); then
    local restore
    for restore in "${restore_paths[@]}"; do
      case "$restore" in "$work_dir"/restore-*)
        [[ ! -e "$restore" && ! -L "$restore" ]] || rm -- "$restore"
      esac
    done
  fi
)

case "$selected_agent" in
  codex) install_agent codex ;;
  claude) install_agent claude ;;
  all) install_agent codex; install_agent claude ;;
esac

if [[ $dry_run -eq 1 ]]; then
  printf 'dry-run complete: %s unchanged\n' "$selected_agent"
else
  printf 'installation complete: %s\n' "$selected_agent"
  if ! command -v coderabbit >/dev/null 2>&1; then
    printf '\noptional CodeRabbit CLI setup (not run automatically):\n'
    printf '  warning: the curl command downloads and executes remote code\n'
    printf '  curl -fsSL https://cli.coderabbit.ai/install.sh | sh\n'
    printf '  coderabbit auth login\n'
    printf '  coderabbit auth status --agent\n'
  else
    if coderabbit_auth_status="$(
      coderabbit auth status --agent 2>/dev/null
    )"; then
      if grep -Eq \
        '"authenticated"[[:space:]]*:[[:space:]]*true' \
        <<<"$coderabbit_auth_status"; then
        :
      elif grep -Eq \
        '"authenticated"[[:space:]]*:[[:space:]]*false' \
        <<<"$coderabbit_auth_status"; then
        printf '\nCodeRabbit CLI authentication required:\n'
        printf '  coderabbit auth login\n'
        printf '  coderabbit auth status --agent\n'
      else
        printf '\nCodeRabbit CLI authentication status unavailable:\n'
        printf '  coderabbit auth status --agent\n'
      fi
    else
      printf '\nCodeRabbit CLI authentication status unavailable:\n'
      printf '  coderabbit auth status --agent\n'
    fi
  fi
fi
