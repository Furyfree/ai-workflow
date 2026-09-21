#!/usr/bin/env bash
# Usage: run.sh <file> ["focus"]. Read-only validators, in parallel, 5 minutes each.
# The file's content travels inside the prompt, so validators need no file access.
# Read-only guards, needed because a CLI may be set to auto-approve: plan mode
# for claude and opencode, the read-only sandbox for codex, a read-only tool
# list for grok. Grok at medium or high effort overruns the 5 minutes; low takes
# under one and still finds real problems.
# VALIDATORS picks the reviewers, default "grok glm"; SKILL.md lists the entries.
set -uf # -f: entries in VALIDATORS are names, never file patterns
[[ -r "${1:-}" ]] || { echo "usage: run.sh <file> [focus]" >&2; exit 2; }
out="$(mktemp -d)"
{
  echo "You are a strict read-only reviewer. Do not modify anything, do not use tools, and do not read AGENTS.md or any other file; everything you need is below. ${2:-}"
  echo "Findings only: numbered, file:line, the problem, the smallest fix. Flag over-engineering and anything that can be deleted. Do not invent scope. No preamble, no praise, under 300 words. If nothing is actionable answer exactly: LGTM"
  echo "----- $1 -----"
  cat "$1"
} >"$out/prompt.txt"

run() { # run <name> <stdin file> <command...>: answer and exit status in <name>.txt, noise in <name>.log
  local name="$1" stdin="$2"; shift 2
  { "$@" <"$stdin"; echo "[exit $?]"; } >"$out/$name.txt" 2>"$out/$name.log" &
}
p="$out/prompt.txt"
for v in ${VALIDATORS:-grok glm}; do
  name="${v%%:*}" model="" file="${v//[:\/~]/-}"
  if [[ "$v" == *:* ]]; then model="${v#*:}"; fi
  if [[ "$name" == glm ]]; then name=opencode; fi
  case "$name" in
    grok) run "$file" /dev/null timeout -k 5 300 grok --prompt-file "$p" --tools "read_file,grep,list_dir" --reasoning-effort low ${model:+-m "$model"} ;;
    claude) run "$file" "$p" timeout -k 5 300 claude -p --permission-mode plan ${model:+--model "$model"} ;;
    codex) run "$file" "$p" timeout -k 5 300 codex exec --skip-git-repo-check -s read-only ${model:+-m "$model"} - ;;
    opencode) run "$file" /dev/null timeout -k 5 300 opencode run --agent plan -m "${model:-openrouter/~z-ai/glm-flash-latest}" -f "$p" -- "Follow the instructions in the attached file." ;;
    *) printf 'unknown validator "%s"\n[exit 127]\n' "$v" >"$out/$file.txt" ;;
  esac
done
wait
echo "$out"
