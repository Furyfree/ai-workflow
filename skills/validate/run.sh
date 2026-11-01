#!/usr/bin/env bash
# Usage: run.sh <file|-> ["focus"]. VALIDATORS entries: provider[:model][@effort].
set -euf # -f: entries in VALIDATORS are names, never file patterns
[[ "${1:-}" == - || -r "${1:-}" ]] || { echo "usage: run.sh <file|-> [focus]" >&2; exit 2; }
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
material="$(cat -- "$1")"
# Same key shapes as SECRET in extensions/git.ts. Print line numbers, never values.
secret='-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|\b(gh[pousr]_|github_pat_|sk-(proj-|ant-)?)[A-Za-z0-9_-]{20,}|\b(AKIA|ASIA)[A-Z0-9]{16}\b'
if [[ "${ALLOW_SECRETS:-}" != 1 ]]; then
  lines="$(grep -nE -e "$secret" <<<"$material" | cut -d: -f1 | paste -sd, -)"
  if [[ -n "$lines" ]]; then
    echo "possible secret on line(s) $lines of the material; nothing sent" >&2
    exit 3
  fi
fi
# Reviewers here are outside providers: send only my own repositories' code.
if [[ "${ALLOW_FOREIGN:-}" != 1 ]]; then
  origin="$(git remote get-url origin 2>/dev/null || true)"
  if [[ ! "$origin" =~ ^(git@github\.com:|ssh://git@github\.com/|https://github\.com/)Furyfree/ ]]; then
    echo "origin is not a Furyfree GitHub repository; nothing sent" >&2
    exit 4
  fi
fi
prompt="$(cat "$here/prompt.txt")"
if [[ -n "${2:-}" ]]; then prompt+=$'\n'"Focus: $2"; fi
prompt+="
----- review material: $1 -----
$material"
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
