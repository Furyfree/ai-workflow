#!/usr/bin/env bash
# Usage: run.sh <file> ["focus"]. Read-only validators, in parallel, 5 minutes each.
# The file's content travels inside the prompt, so validators need no file access.
# Plan mode is the only read-only guard when a CLI is set to auto-approve; keep
# it. It is not a sandbox.
# VALIDATE_CLAUDE=<alias> adds Claude. VALIDATE_GLM=<provider/model> swaps the opencode model.
set -u
[[ -r "${1:-}" ]] || { echo "usage: run.sh <file> [focus]" >&2; exit 2; }
out="$(mktemp -d)"
{
  echo "You are a strict read-only reviewer. Do not modify anything, do not use tools, and do not read AGENTS.md or any other file; everything you need is below. ${2:-}"
  echo "Findings only: numbered, file:line, the problem, the smallest fix. Flag over-engineering and anything that can be deleted. Do not invent scope. No preamble, no praise, under 300 words. If nothing is actionable answer exactly: LGTM"
  echo "----- $1 -----"
  cat "$1"
} >"$out/prompt.txt"

run() { # run <name> <command...>: output and exit status land in $out/<name>.txt
  local name="$1"; shift
  { "$@"; echo "[exit $?]"; } >"$out/$name.txt" 2>&1 </dev/null &
}
run grok timeout -k 5 300 grok --prompt-file "$out/prompt.txt" --permission-mode plan
run glm timeout -k 5 300 opencode run --agent plan -m "${VALIDATE_GLM:-openrouter/~z-ai/glm-flash-latest}" \
  -f "$out/prompt.txt" -- "Follow the instructions in the attached file."
if [[ -n "${VALIDATE_CLAUDE:-}" ]]; then # a model alias from `claude --help`, such as opus
  # shellcheck disable=SC2016 # $1 and $2 belong to the inner sh
  run claude sh -c 'timeout -k 5 300 claude -p --model "$1" --permission-mode plan <"$2"' _ "$VALIDATE_CLAUDE" "$out/prompt.txt"
fi
wait
echo "$out"
