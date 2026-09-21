#!/usr/bin/env bash
# Usage: run.sh <file|-> ["focus"]. VALIDATORS entries: provider[:model][@effort].
set -euf # -f: entries in VALIDATORS are names, never file patterns
[[ "${1:-}" == - || -r "${1:-}" ]] || { echo "usage: run.sh <file|-> [focus]" >&2; exit 2; }
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
prompt="$(cat "$here/prompt.txt")"
if [[ -n "${2:-}" ]]; then prompt+=$'\n'"Focus: $2"; fi
prompt+="
----- review material: $1 -----
$(cat -- "$1")"
out="$(mktemp -d)"
index=0
for v in ${VALIDATORS:-grok@low glm}; do
  model="" effort=""
  if [[ "$v" == *@* ]]; then effort="${v##*@}"; v="${v%@*}"; fi
  name="${v%%:*}"
  if [[ "$v" == *:* ]]; then model="${v#*:}"; fi
  if [[ "$name" == glm ]]; then
    name=opencode; model="${model:-openrouter/~z-ai/glm-flash-latest}"
  fi
  index=$((index + 1))
  file="$index-${v//[^a-zA-Z0-9_-]/-}"
  (
    status=0
    "$here/../subagent/run.sh" --review "$name" "$model" "$effort" <<<"$prompt" || status=$?
    printf '\n[exit %s]\n' "$status"
  ) >"$out/$file.txt" 2>"$out/$file.log" &
done
wait
echo "$out"
