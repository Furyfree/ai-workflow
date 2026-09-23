#!/usr/bin/env bash
# Usage: run.sh [--edit|--review] <claude|grok|codex|opencode|pi> [model] [effort]
# Task on stdin, answer on stdout. Editing uses the CLI's saved permissions.
set -euo pipefail
mode=read-only
case "${1:-}" in --edit|--review) mode="${1#--}"; shift ;; esac
if (($# < 1 || $# > 3)); then
  echo 'usage: run.sh [--edit|--review] <claude|grok|codex|opencode|pi> [model] [effort]' >&2
  exit 2
fi
provider="$1" model="${2:-}" effort="${3:-}"
case "$provider" in
  claude)
    cmd=(claude -p)
    case "$mode" in
      read-only) cmd+=(--tools "Read,Grep,Glob" --strict-mcp-config) ;;
      review) cmd+=(--tools "" --strict-mcp-config) ;;
    esac
    [[ -z "$model" ]] || cmd+=(--model "$model")
    [[ -z "$effort" ]] || cmd+=(--effort "$effort")
    ;;
  grok)
    cmd=(grok --no-subagents)
    # Grok treats --tools "" as all tools; never pass it.
    if [[ "$mode" != edit ]]; then cmd+=(--tools "read_file,grep,list_dir"); fi
    [[ -z "$model" ]] || cmd+=(-m "$model")
    [[ -z "$effort" ]] || cmd+=(--reasoning-effort "$effort")
    ;;
  codex)
    cmd=(codex exec --skip-git-repo-check)
    if [[ "$mode" != edit ]]; then cmd+=(-s read-only); fi
    [[ -z "$model" ]] || cmd+=(-m "$model")
    [[ -z "$effort" ]] || cmd+=(-c "model_reasoning_effort=\"$effort\"")
    cmd+=(-)
    ;;
  opencode)
    [[ -n "$model" ]] || { echo 'opencode needs a discovered provider/model' >&2; exit 2; }
    cmd=(opencode run -m "$model" --agent)
    if [[ "$mode" == edit ]]; then cmd+=(build); else cmd+=(plan); fi
    [[ -z "$effort" ]] || cmd+=(--variant "$effort")
    ;;
  pi)
    # Pi has no sandbox: read-only rests on the tool allowlist alone.
    cmd=(pi -p --no-session)
    case "$mode" in
      read-only) cmd+=(--no-extensions --tools "read,grep,find,ls") ;;
      review) cmd+=(--no-extensions --no-tools) ;;
    esac
    [[ -z "$model" ]] || cmd+=(--model "$model")
    [[ -z "$effort" ]] || cmd+=(--thinking "$effort")
    ;;
  *) echo "unknown CLI: $provider" >&2; exit 2 ;;
esac
if [[ "$provider" == grok || "$provider" == opencode ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf -- "$tmp"' EXIT
  cat >"$tmp/prompt.txt"
  case "$provider" in
    grok) cmd+=(--prompt-file "$tmp/prompt.txt") ;;
    opencode) cmd+=(-f "$tmp/prompt.txt" -- "Follow the attached task.") ;;
  esac
fi
# Grok High can exceed five minutes. Keep the bound here for every caller.
case "$provider" in
  grok|opencode) timeout -k 5 600 "${cmd[@]}" </dev/null ;;
  *) exec timeout -k 5 600 "${cmd[@]}" ;;
esac
