#!/usr/bin/env bash
# Installer preservation checks in a disposable HOME; no live agent settings.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fixture="$tmp/repo"
mkdir -p "$fixture"/{skills/{local,wrapper},vendor/{local,wrapped},extensions/pi/{bundle,subagent/agents}}
cp "$repo/install.sh" "$fixture/install.sh"
printf 'rules\n' >"$fixture/rules.md"
printf 'name: local\n' >"$fixture/skills/local/SKILL.md"
printf '../../vendor/wrapped/SKILL.md\n' >"$fixture/skills/wrapper/SKILL.md"
printf 'name: local\n' >"$fixture/vendor/local/SKILL.md"
printf 'name: wrapped\n' >"$fixture/vendor/wrapped/SKILL.md"
printf 'extension\n' >"$fixture/extensions/pi/single.ts"
printf 'directory extension\n' >"$fixture/extensions/pi/bundle/index.ts"
printf 'subagent\n' >"$fixture/extensions/pi/subagent/index.ts"
printf 'role\n' >"$fixture/extensions/pi/subagent/agents/helper.md"
printf 'inactive\n' >"$fixture/extensions/pi/draft.ts.todo"
export HOME="$tmp/home"
mkdir -p "$HOME"/{.claude,.codex,.config/opencode,.pi/agent/extensions}
printf 'personal rules\n' >"$HOME/.claude/CLAUDE.md"
printf 'personal extension\n' >"$HOME/.pi/agent/extensions/single.ts"
"$fixture/install.sh" >"$tmp/install.log"
grep -qx 'personal rules' "$HOME/.claude/CLAUDE.md"
grep -qx 'personal extension' "$HOME/.pi/agent/extensions/single.ts"
[[ "$(readlink "$HOME/.codex/AGENTS.md")" == "$fixture/rules.md" ]]
[[ "$(readlink "$HOME/.agents/skills/local")" == "$fixture/skills/local" ]]
[[ "$(readlink "$HOME/.pi/agent/extensions/bundle")" == "$fixture/extensions/pi/bundle" ]]
[[ "$(readlink "$HOME/.pi/agent/agents/helper.md")" == "$fixture/extensions/pi/subagent/agents/helper.md" ]]
[[ ! -e "$HOME/.agents/skills/wrapped" && ! -e "$HOME/.pi/agent/extensions/draft.ts.todo" ]]
"$fixture/install.sh" --force >"$tmp/force.log"
[[ -L "$HOME/.claude/CLAUDE.md" && -L "$HOME/.pi/agent/extensions/single.ts" ]]
backup=("$HOME"/.local/state/ai-workflow-backup/*)
grep -qx 'personal rules' "${backup[0]}/.claude/CLAUDE.md"
grep -qx 'personal extension' "${backup[0]}/.pi/agent/extensions/single.ts"
"$fixture/install.sh" >"$tmp/repeat.log"
[[ -L "$HOME/.pi/agent/extensions/bundle" ]]
# Foreign links survive uninstall; removed source directories and roles are pruned.
printf 'foreign\n' >"$tmp/foreign"
rm "$HOME/.pi/agent/extensions/single.ts"
ln -s "$tmp/foreign" "$HOME/.pi/agent/extensions/single.ts"
rm -r "$fixture/extensions/pi/bundle"
rm "$fixture/extensions/pi/subagent/agents/helper.md"
"$fixture/install.sh" >"$tmp/prune.log"
[[ ! -L "$HOME/.pi/agent/extensions/bundle" && ! -L "$HOME/.pi/agent/agents/helper.md" ]]
"$fixture/install.sh" --uninstall >"$tmp/uninstall.log"
[[ ! -L "$HOME/.codex/AGENTS.md" && ! -L "$HOME/.agents/skills/local" ]]
[[ ! -L "$HOME/.pi/agent/extensions/subagent" ]]
[[ "$(readlink "$HOME/.pi/agent/extensions/single.ts")" == "$tmp/foreign" ]]
grep -qx 'personal rules' "${backup[0]}/.claude/CLAUDE.md"
echo 'Installer preservation checks passed'

if ! command -v pi >/dev/null; then
  echo 'SKIP: Pi runtime checks require an installed Pi'
  exit 0
fi
export HOME="$tmp/runtime"
mkdir -p "$HOME/.pi/agent" "$HOME/cwd" "$HOME/tmp"
"$repo/install.sh" >"$tmp/runtime-install.log"
# Load the installed symlinks through Pi itself, offline and without accounts.
cd "$HOME/cwd"
export PI_CODING_AGENT_DIR="$HOME/.pi/agent" PI_OFFLINE=1 PI_TELEMETRY=0
export AI_WORKFLOW_TEST_ROOT="$HOME" TMPDIR="$HOME/tmp"
status=0
timeout -k 5 60 pi --mode rpc --no-session --offline --no-approve \
  --no-skills --no-prompt-templates --no-context-files \
  --extension "$repo/extensions/test.ts" </dev/null >"$tmp/runtime.log" 2>&1 || status=$?
if ((status != 0)) || ! grep -q '^Pi extension checks passed$' "$tmp/runtime.log"; then
  printf 'Pi runtime checks failed (exit %s):\n' "$status" >&2
  tail -n 100 "$tmp/runtime.log" >&2
  exit 1
fi
echo 'Pi extension checks passed'
