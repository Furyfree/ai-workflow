#!/usr/bin/env bash
# Usage: run.sh [--events] [--edit|--review] <cli> [model] [effort]
# Task on stdin; text on stdout, or native JSON with --events.
# --events is for the Pi manager, which owns the process group and deadline.
set -euo pipefail
mode=read-only events=false
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --edit|--review) mode="${1#--}" ;;
    --events) events=true ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
if (($# < 1 || $# > 3)); then
  echo 'usage: run.sh [--events] [--edit|--review] <cli> [model] [effort]' >&2
  exit 2
fi
[[ "${AI_WORKFLOW_SUBAGENT:-}" != 1 ]] || { echo 'nested subagents are disabled' >&2; exit 2; }
export AI_WORKFLOW_SUBAGENT=1
provider="$1" model="${2:-}" effort="${3:-}"
case "$provider" in
  claude)
    cmd=(claude -p --disallowed-tools "Agent,Workflow")
    $events && cmd+=(--output-format json)
    case "$mode" in
      read-only) cmd+=(--tools "Read,Grep,Glob" --strict-mcp-config) ;;
      review) cmd+=(--tools "" --strict-mcp-config) ;;
    esac
    [[ -z "$model" ]] || cmd+=(--model "$model")
    [[ -z "$effort" ]] || cmd+=(--effort "$effort")
    ;;
  grok)
    export GROK_DISABLE_AUTOUPDATER=1
    cmd=(grok --no-subagents)
    $events && cmd+=(--output-format json)
    # Grok treats --tools "" as all tools; never pass it.
    if [[ "$mode" != edit ]]; then cmd+=(--sandbox read-only --tools "read_file,grep,list_dir"); fi
    [[ -z "$model" ]] || cmd+=(-m "$model")
    [[ -z "$effort" ]] || cmd+=(--reasoning-effort "$effort")
    ;;
  codex)
    cmd=(codex exec --skip-git-repo-check -c agents.enabled=false -c features.multi_agent_v2=false)
    $events && cmd+=(--json)
    if [[ "$mode" != edit ]]; then cmd+=(-s read-only); fi
    [[ -z "$model" ]] || cmd+=(-m "$model")
    [[ -z "$effort" ]] || cmd+=(-c "model_reasoning_effort=\"$effort\"")
    cmd+=(-)
    ;;
  opencode)
    [[ -n "$model" ]] || { echo 'opencode needs a discovered provider/model' >&2; exit 2; }
    [[ -z "${OPENCODE_CONFIG_CONTENT:-}" ]] || {
      echo 'cannot combine subagent permissions with OPENCODE_CONFIG_CONTENT; ask before changing that override' >&2
      exit 2
    }
    selection="$model"
    if [[ -n "$effort" ]]; then
      [[ "$model" != *'#'* ]] || { echo 'pass the OpenCode variant either in the model or as effort, not both' >&2; exit 2; }
      selection+="#$effort"
    fi
    cmd=(opencode run --standalone -m "$selection" --agent)
    if [[ "$mode" == edit ]]; then
      export OPENCODE_CONFIG_CONTENT='{"agents":{"build":{"permissions":[{"action":"subagent","resource":"*","effect":"deny"}]}}}'
      cmd+=(build)
    else
      export OPENCODE_CONFIG_CONTENT='{"agents":{"ai-workflow-reader":{"mode":"primary","permissions":[{"action":"*","resource":"*","effect":"deny"},{"action":"read","resource":"*","effect":"allow"},{"action":"read","resource":"*.env","effect":"ask"},{"action":"read","resource":"*.env.*","effect":"ask"},{"action":"read","resource":"*.env.example","effect":"allow"},{"action":"glob","resource":"*","effect":"allow"},{"action":"grep","resource":"*","effect":"allow"}]}}}'
      cmd+=(ai-workflow-reader)
    fi
    $events && cmd+=(--format json)
    ;;
  pi)
    # Pi has no sandbox: read-only rests on the tool allowlist alone.
    cmd=(pi -p --no-session)
    $events && cmd+=(--mode json)
    case "$mode" in
      read-only) cmd+=(--no-extensions --tools "read,grep,find,ls") ;;
      review) cmd+=(--no-extensions --no-tools) ;;
      # Keep saved permission extensions, but omit delegation/codemode tools.
      edit) cmd+=(--tools "read,bash,edit,write,grep,find,ls") ;;
    esac
    [[ -z "$model" ]] || cmd+=(--model "$model")
    [[ -z "$effort" ]] || cmd+=(--thinking "$effort")
    ;;
  *) echo "unknown CLI: $provider" >&2; exit 2 ;;
esac
if [[ "$provider" == grok || "$provider" == opencode ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf -- "$tmp"' EXIT
  trap 'exit 143' TERM
  trap 'exit 130' INT
  cat >"$tmp/prompt.txt"
  case "$provider" in
    grok) cmd+=(--prompt-file "$tmp/prompt.txt") ;;
    opencode) cmd+=(-f "$tmp/prompt.txt" -- "Follow the attached task.") ;;
  esac
fi
# Managed runs stay in the manager's process group; GNU timeout would create
# another group. The manager kills the whole group after ten minutes.
if $events; then
  case "$provider" in
    grok|opencode) "${cmd[@]}" </dev/null ;;
    *) exec "${cmd[@]}" ;;
  esac
else
  # Grok High can exceed five minutes. Bound every standalone caller.
  case "$provider" in
    grok|opencode) timeout -k 5 600 "${cmd[@]}" </dev/null ;;
    *) exec timeout -k 5 600 "${cmd[@]}" ;;
  esac
fi
