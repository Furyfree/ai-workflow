#!/usr/bin/env bash
# Exercise the real launchers with fake CLIs; no accounts or network needed.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/bin" "$tmp/results"
cat >"$tmp/bin/cli" <<'SH'
#!/usr/bin/env bash
printf '<%s>\n' "$@"
file_next=false
for arg; do
  if $file_next; then cat -- "$arg"; file_next=false; fi
  case "$arg" in --prompt-file|-f) file_next=true ;; esac
done
cat
exit "${FAKE_EXIT:-0}"
SH
cat >"$tmp/bin/timeout" <<'SH'
#!/usr/bin/env bash
[[ "$1 $2 $3" == '-k 5 600' ]] || exit 91
shift 3
exec "$@"
SH
chmod +x "$tmp/bin/cli" "$tmp/bin/timeout"
for cli in claude grok codex opencode pi; do ln -s cli "$tmp/bin/$cli"; done
export PATH="$tmp/bin:$PATH" TMPDIR="$tmp/results"
# shellcheck disable=SC2016 # The task must reach the CLI literally.
prompt='Task with "quotes", * and $(not-a-command).
Second line.'
expect() {
  local file="$1" contents; shift
  contents="$(cat "$file")"
  for line; do
    [[ "$contents" == *"$line"* ]] || { echo "missing '$line' in $file" >&2; exit 1; }
  done
}
status_is() {
  local expected="$1" actual=0; shift
  "$@" >"$tmp/status.out" 2>"$tmp/status.err" || actual=$?
  [[ "$actual" == "$expected" ]] || { echo "expected exit $expected, got $actual" >&2; exit 1; }
}

# Exact model/effort and task text reach each provider; default guards stay on.
"$here/run.sh" claude opus high <<<"$prompt" >"$tmp/claude"
expect "$tmp/claude" '<--model>' '<opus>' '<--effort>' '<high>' '<Read,Grep,Glob>' '<--strict-mcp-config>' "$prompt"
if grep -Fq '<plan>' "$tmp/claude"; then echo 'Claude must not enter plan mode' >&2; exit 1; fi
"$here/run.sh" grok grok-test high <<<"$prompt" >"$tmp/grok"
expect "$tmp/grok" '<grok-test>' '<--reasoning-effort>' '<high>' '<read_file,grep,list_dir>' "$prompt"
"$here/run.sh" codex gpt-test xhigh <<<"$prompt" >"$tmp/codex"
expect "$tmp/codex" '<gpt-test>' '<model_reasoning_effort="xhigh">' '<read-only>' "$prompt"
"$here/run.sh" opencode openrouter/test max <<<"$prompt" >"$tmp/opencode"
expect "$tmp/opencode" '<openrouter/test>' '<--variant>' '<max>' '<plan>' "$prompt"
"$here/run.sh" pi anthropic/test xhigh <<<"$prompt" >"$tmp/pi"
expect "$tmp/pi" '<-p>' '<--no-session>' '<--model>' '<anthropic/test>' '<--thinking>' '<xhigh>' \
  '<--no-extensions>' '<read,grep,find,ls>' "$prompt"
"$here/run.sh" --review pi <<<"$prompt" >"$tmp/pi-review"
expect "$tmp/pi-review" '<--no-extensions>' '<--no-tools>' "$prompt"
if grep -Eq '<(--tools|--model|--thinking)>' "$tmp/pi-review"; then echo 'Pi review must have no tools or forced model' >&2; exit 1; fi

# Larger than Linux's single-argument limit; compare the complete received task.
head -c 200000 /dev/zero | tr '\0' x >"$tmp/large"
printf '\n' >>"$tmp/large"
for cli in grok opencode pi; do
  "$here/run.sh" "$cli" test-model high <"$tmp/large" >"$tmp/large-output"
  tail -c "$(wc -c <"$tmp/large")" "$tmp/large-output" | cmp - "$tmp/large"
done

# No forced effort or model; edit mode must be an explicit caller choice.
"$here/run.sh" grok <<<"$prompt" >"$tmp/default"
if grep -Eq '<(-m|--reasoning-effort)>' "$tmp/default"; then exit 1; fi
for cli in claude grok codex pi opencode; do
  "$here/run.sh" --edit "$cli" test-model high <<<"$prompt" >"$tmp/edit"
  if grep -Eq '<(plan|read-only|read_file,grep,list_dir|Read,Grep,Glob|--strict-mcp-config|--no-tools|--no-extensions|read,grep,find,ls)>' "$tmp/edit"; then exit 1; fi
done
expect "$tmp/edit" '<build>'
status_is 2 "$here/run.sh" opencode
status_is 2 "$here/run.sh" unknown
for cli in grok opencode pi; do
  status_is 7 env FAKE_EXIT=7 "$here/run.sh" "$cli" test-model <<<"$prompt"
  status_is 124 env FAKE_EXIT=124 "$here/run.sh" "$cli" test-model <<<"$prompt"
done
[[ -z "$(ls -A "$TMPDIR")" ]] || { echo 'temporary prompts were not removed' >&2; exit 1; }

# Use the installed skill layout from another cwd, not just the repo root.
ln -s "$here/../validate" "$tmp/validate"
cd "$tmp"
out="$(VALIDATORS='grok:grok-test@high claude:opus@high codex:gpt-test@xhigh glm@max opencode:openrouter/deepseek-test@max' \
  "$tmp/validate/run.sh" - 'check behaviour' <<<"$prompt")"
expect "$out"/1-*.txt '<grok-test>' '<--reasoning-effort>' '<high>' '<read_file,grep,list_dir>' '[exit 0]'
grok_review="$(cat "$out"/1-*.txt)"
if [[ "$grok_review" == *$'<--tools>\n<>'* ]]; then echo 'Grok empty tool list enables all tools' >&2; exit 1; fi
expect "$out"/2-*.txt '<opus>' '<--effort>' '<high>' $'<--tools>\n<>' '<--strict-mcp-config>' '[exit 0]'
if grep -Eq '<(plan|Read,Grep,Glob)>' "$out"/2-*.txt; then echo 'Claude review tools enabled' >&2; exit 1; fi
expect "$out"/3-*.txt '<gpt-test>' '<model_reasoning_effort="xhigh">' '[exit 0]'
expect "$out"/4-*.txt '<openrouter/~z-ai/glm-flash-latest>' '<--variant>' '<max>' '[exit 0]'
expect "$out"/5-*.txt '<openrouter/deepseek-test>' '<max>' '[exit 0]'
for answer in "$out"/*.txt; do
  while IFS= read -r line; do grep -Fq -- "$line" "$answer"; done <"$here/../validate/prompt.txt"
  grep -Fq -- 'Focus: check behaviour' "$answer"
  expect "$answer" '----- review material: - -----'
  grep -Fq -- "$prompt" "$answer"
done
[[ ! -e "$out/prompt.txt" ]]

out="$(VALIDATORS='grok@high opencode:test/model@max' "$tmp/validate/run.sh" "$tmp/large")"
for answer in "$out"/*.txt; do
  expect "$answer" '[exit 0]' "----- review material: $tmp/large -----"
  if grep -q '^Focus:' "$answer"; then echo 'empty review focus included' >&2; exit 1; fi
  awk 'length($0) == 200000 {print}' "$answer" | cmp - "$tmp/large"
done

# Defaults use Low; the explicit High review above must still pass through.
out="$(env -u VALIDATORS "$tmp/validate/run.sh" - <<<"$prompt")"
expect "$out"/1-*.txt '<--reasoning-effort>' '<low>' '<read_file,grep,list_dir>' '[exit 0]'
expect "$out"/2-*.txt '<openrouter/~z-ai/glm-flash-latest>' '[exit 0]'

# The wrapper must preserve failures rather than claim a successful review.
out="$(FAKE_EXIT=124 VALIDATORS=grok "$tmp/validate/run.sh" - <<<"$prompt")"
expect "$out"/1-*.txt '[exit 124]'
out="$(VALIDATORS=unknown "$tmp/validate/run.sh" - <<<"$prompt")"
expect "$out"/1-*.txt '[exit 2]'
echo 'CLI workflow checks passed'
