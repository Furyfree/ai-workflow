#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/ai-workflow-test.XXXXXXXX")"

cleanup() {
  case "$test_root" in
    "${TMPDIR:-/tmp}"/ai-workflow-test.*) rm -rf -- "$test_root" ;;
  esac
}
trap cleanup EXIT

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

assert_link() {
  local target="$1" source="$2"
  [[ -L "$target" ]] || fail "expected symlink: $target"
  [[ "$(readlink "$target")" == "$source" ]] ||
    fail "unexpected symlink target: $target"
}

assert_same_link() {
  local target="$1" source="$2"
  [[ -L "$target" ]] || fail "expected symlink: $target"
  [[ "$(readlink -f "$target")" == "$(readlink -f "$source")" ]] ||
    fail "unexpected resolved symlink target: $target"
}

fixture="$test_root/source"
mkdir -p "$fixture"
cp -a "$repo_root/codex" "$repo_root/global" "$repo_root/.agents" "$fixture/"

export HOME="$test_root/home with spaces"
export CODEX_HOME="$test_root/codex home"
export AGENTS_HOME="$test_root/agents home"
export CLAUDE_CONFIG_DIR="$test_root/claude home"
export AI_WORKFLOW_STATE_DIR="$test_root/state"

dry_root="$test_root/dry"
HOME="$dry_root/home" CODEX_HOME="$dry_root/codex" \
  AGENTS_HOME="$dry_root/agents" CLAUDE_CONFIG_DIR="$dry_root/claude" \
  AI_WORKFLOW_STATE_DIR="$dry_root/state" \
  "$repo_root/scripts/install.sh" --source "$fixture" --dry-run >/dev/null
[[ ! -e "$dry_root" ]] || fail "dry-run created target or state directories"

mkdir -p "$CODEX_HOME"
printf 'original codex instructions\n' >"$CODEX_HOME/AGENTS.md"
mkdir -p "$CODEX_HOME/rules"
printf 'original codex rules\n' >"$CODEX_HOME/rules/ai-workflow.rules"
mkdir -p "$CLAUDE_CONFIG_DIR"
printf 'original claude instructions\n' >"$CLAUDE_CONFIG_DIR/CLAUDE.md"
mkdir -p "$AGENTS_HOME/skills"
ln -s "../../source/.agents/skills/passthrough" \
  "$AGENTS_HOME/skills/passthrough"
"$repo_root/scripts/install.sh" --source "$fixture"

assert_link "$CODEX_HOME/AGENTS.md" "$fixture/global/shared.md"
assert_link "$CODEX_HOME/rules/ai-workflow.rules" \
  "$fixture/codex/rules/ai-workflow.rules"
assert_link "$CLAUDE_CONFIG_DIR/CLAUDE.md" "$fixture/global/shared.md"
for skill in ai-project-manager html-plan pr-readiness subagent; do
  assert_link "$AGENTS_HOME/skills/$skill" "$fixture/.agents/skills/$skill"
  assert_link "$CLAUDE_CONFIG_DIR/skills/$skill" "$fixture/.agents/skills/$skill"
done
assert_same_link "$AGENTS_HOME/skills/passthrough" \
  "$fixture/.agents/skills/passthrough"
assert_link "$CLAUDE_CONFIG_DIR/skills/passthrough" \
  "$fixture/.agents/skills/passthrough"

codex_manifest="$AI_WORKFLOW_STATE_DIR/codex.tsv"
claude_manifest="$AI_WORKFLOW_STATE_DIR/claude.tsv"
[[ -f "$codex_manifest" && -f "$claude_manifest" ]] ||
  fail "agent manifests missing"
grep -Fq "$AGENTS_HOME/skills/passthrough" "$codex_manifest" ||
  fail "matching existing link was not adopted"
backup="$(awk -F '\t' '$1 == "entry" && $3 != "-" { print $3; exit }' "$codex_manifest")"
[[ -f "$backup" ]] || fail "Codex conflict backup missing"
grep -Fq "original codex instructions" "$backup" || fail "backup content changed"
rules_backup="$(awk -F '\t' -v target="$CODEX_HOME/rules/ai-workflow.rules" \
  '$1 == "entry" && $2 == target { print $3; exit }' "$codex_manifest")"
[[ -f "$rules_backup" ]] || fail "Codex rules backup missing"
grep -Fq "original codex rules" "$rules_backup" ||
  fail "Codex rules backup content changed"
claude_backup="$(awk -F '\t' -v target="$CLAUDE_CONFIG_DIR/CLAUDE.md" \
  '$1 == "entry" && $2 == target { print $3; exit }' "$claude_manifest")"
[[ -f "$claude_backup" ]] || fail "Claude conflict backup missing"
grep -Fq "original claude instructions" "$claude_backup" ||
  fail "Claude backup content changed"

manifest_hash="$(sha256sum "$codex_manifest" | awk '{print $1}')"
"$repo_root/scripts/install.sh" --source "$fixture" >/dev/null
[[ "$(sha256sum "$codex_manifest" | awk '{print $1}')" == "$manifest_hash" ]] ||
  fail "repeated installation rewrote an unchanged manifest"

printf '\nlive update\n' >>"$fixture/.agents/skills/pr-readiness/SKILL.md"
grep -Fq "live update" "$AGENTS_HOME/skills/pr-readiness/SKILL.md" ||
  fail "source edit was not visible through installed link"
printf '\n# live rule update\n' >>"$fixture/codex/rules/ai-workflow.rules"
grep -Fq "live rule update" "$CODEX_HOME/rules/ai-workflow.rules" ||
  fail "rule source edit was not visible through installed link"

rm -- "$AGENTS_HOME/skills/pr-readiness"
printf 'local drift\n' >"$AGENTS_HOME/skills/pr-readiness"
if "$repo_root/scripts/install.sh" --source "$fixture" --agent codex >/dev/null 2>&1; then
  fail "install accepted local drift"
fi
if "$repo_root/scripts/uninstall.sh" >/dev/null 2>&1; then
  fail "uninstall accepted local drift"
fi
rm -- "$AGENTS_HOME/skills/pr-readiness"
ln -s "$fixture/.agents/skills/pr-readiness" "$AGENTS_HOME/skills/pr-readiness"

rm -- "$CLAUDE_CONFIG_DIR/skills/pr-readiness"
printf 'local drift\n' >"$CLAUDE_CONFIG_DIR/skills/pr-readiness"
if "$repo_root/scripts/install.sh" --source "$fixture" \
  --agent claude >/dev/null 2>&1; then
  fail "Claude install accepted local drift"
fi
if "$repo_root/scripts/uninstall.sh" --agent claude >/dev/null 2>&1; then
  fail "Claude uninstall accepted local drift"
fi
rm -- "$CLAUDE_CONFIG_DIR/skills/pr-readiness"
ln -s "$fixture/.agents/skills/pr-readiness" \
  "$CLAUDE_CONFIG_DIR/skills/pr-readiness"

"$repo_root/scripts/uninstall.sh" --dry-run >/dev/null
"$repo_root/scripts/uninstall.sh" >/dev/null
grep -Fq "original codex instructions" "$CODEX_HOME/AGENTS.md" ||
  fail "uninstall did not restore Codex instructions"
grep -Fq "original codex rules" "$CODEX_HOME/rules/ai-workflow.rules" ||
  fail "uninstall did not restore Codex rules"
grep -Fq "original claude instructions" "$CLAUDE_CONFIG_DIR/CLAUDE.md" ||
  fail "uninstall did not restore Claude instructions"
for skill in ai-project-manager html-plan passthrough pr-readiness subagent; do
  [[ ! -e "$AGENTS_HOME/skills/$skill" &&
    ! -L "$AGENTS_HOME/skills/$skill" ]] ||
    fail "uninstall did not remove Codex skill: $skill"
  [[ ! -e "$CLAUDE_CONFIG_DIR/skills/$skill" &&
    ! -L "$CLAUDE_CONFIG_DIR/skills/$skill" ]] ||
    fail "uninstall did not remove Claude skill: $skill"
done

unsafe_state="$test_root/unsafe state"
mkdir -p "$unsafe_state"
ln -s "$fixture/global/shared.md" "$test_root/outside"
printf '# ai-workflow-manifest-v1\nentry\t%s\t-\t%s\n' \
  "$AGENTS_HOME/skills/../../outside" "$fixture/global/shared.md" \
  >"$unsafe_state/codex.tsv"
if "$repo_root/scripts/uninstall.sh" --agent codex \
  --state-dir "$unsafe_state" >/dev/null 2>&1; then
  fail "uninstall accepted an escaping manifest target"
fi
[[ -L "$test_root/outside" ]] ||
  fail "unsafe manifest changed an escaping target"

unsafe_backup_state="$test_root/unsafe backup state"
mkdir -p "$unsafe_backup_state" "$AGENTS_HOME/skills"
ln -s "$fixture/global/shared.md" "$AGENTS_HOME/skills/unsafe-backup"
printf 'outside backup\n' >"$test_root/outside-backup"
printf '# ai-workflow-manifest-v1\nentry\t%s\t%s\t%s\n' \
  "$AGENTS_HOME/skills/unsafe-backup" \
  "$unsafe_backup_state/backups/codex-test/../../../outside-backup" \
  "$fixture/global/shared.md" >"$unsafe_backup_state/codex.tsv"
if "$repo_root/scripts/uninstall.sh" --agent codex \
  --state-dir "$unsafe_backup_state" >/dev/null 2>&1; then
  fail "uninstall accepted an escaping manifest backup"
fi
[[ -L "$AGENTS_HOME/skills/unsafe-backup" ]] ||
  fail "unsafe backup manifest changed its managed target"

claude_only="$test_root/claude only"
HOME="$claude_only/home" CODEX_HOME="$claude_only/codex" \
  AGENTS_HOME="$claude_only/agents" CLAUDE_CONFIG_DIR="$claude_only/claude" \
  AI_WORKFLOW_STATE_DIR="$claude_only/state" \
  "$repo_root/scripts/install.sh" --source "$fixture" --agent claude >/dev/null
[[ ! -e "$claude_only/codex" ]] ||
  fail "Claude-only install changed Codex home"
assert_link "$claude_only/claude/CLAUDE.md" "$fixture/global/shared.md"

partial_root="$test_root/partial uninstall"
partial_codex="$partial_root/codex"
partial_agents="$partial_root/agents"
partial_state="$partial_root/state"
mkdir -p "$partial_codex"
printf 'partial original\n' >"$partial_codex/AGENTS.md"
HOME="$partial_root/home" CODEX_HOME="$partial_codex" \
  AGENTS_HOME="$partial_agents" CLAUDE_CONFIG_DIR="$partial_root/claude" \
  AI_WORKFLOW_STATE_DIR="$partial_state" \
  "$repo_root/scripts/install.sh" --source "$fixture" --agent codex >/dev/null
partial_manifest="$partial_state/codex.tsv"
partial_backup="$(awk -F '\t' -v target="$partial_codex/AGENTS.md" \
  '$1 == "entry" && $2 == target { print $3; exit }' "$partial_manifest")"
rm -- "$partial_codex/AGENTS.md"
mv -- "$partial_backup" "$partial_codex/AGENTS.md"
HOME="$partial_root/home" CODEX_HOME="$partial_codex" \
  AGENTS_HOME="$partial_agents" CLAUDE_CONFIG_DIR="$partial_root/claude" \
  AI_WORKFLOW_STATE_DIR="$partial_state" \
  "$repo_root/scripts/uninstall.sh" --agent codex >/dev/null
grep -Fq "partial original" "$partial_codex/AGENTS.md" ||
  fail "resumed uninstall lost an already restored target"
[[ ! -e "$partial_manifest" ]] ||
  fail "resumed uninstall kept a completed manifest"

printf 'installer tests passed\n'
