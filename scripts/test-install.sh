#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/ai-workflow-test.XXXXXXXX")"

cleanup() {
  case "$test_root" in
    "${TMPDIR:-/tmp}"/ai-workflow-test.*) rm -rf -- "$test_root" ;;
    *) printf 'warning: refused unexpected cleanup path: %s\n' "$test_root" >&2 ;;
  esac
}
trap cleanup EXIT

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

assert_file_contains() {
  local file="$1"
  local pattern="$2"
  grep -Fq "$pattern" "$file" || fail "$file does not contain: $pattern"
}

fixture_source="$test_root/source"
mkdir -p "$fixture_source"
cp -a "$repo_root/global" "$repo_root/.agents" "$fixture_source/"

test_home="$test_root/home with spaces"
export HOME="$test_home"
export CODEX_HOME="$test_root/codex home"
export AGENTS_HOME="$test_root/agents home"
export CLAUDE_CONFIG_DIR="$test_root/claude home"
export AI_WORKFLOW_STATE_DIR="$test_root/state"

mkdir -p "$CODEX_HOME"
printf 'original codex instructions\n' >"$CODEX_HOME/AGENTS.md"

"$repo_root/scripts/install.sh" --source "$fixture_source" --agent all --mode copy

[[ -f "$CODEX_HOME/AGENTS.md" && ! -L "$CODEX_HOME/AGENTS.md" ]] ||
  fail "Codex instructions were not rendered as a regular file"
[[ -f "$CLAUDE_CONFIG_DIR/CLAUDE.md" && ! -L "$CLAUDE_CONFIG_DIR/CLAUDE.md" ]] ||
  fail "Claude instructions were not rendered as a regular file"
assert_file_contains "$CODEX_HOME/AGENTS.md" "Shared development agreements"
assert_file_contains "$CODEX_HOME/AGENTS.md" "Codex adapter"
assert_file_contains "$CLAUDE_CONFIG_DIR/CLAUDE.md" "Claude Code adapter"

for skill in ai-project-manager html-plan pr-readiness; do
  [[ -d "$AGENTS_HOME/skills/$skill" && ! -L "$AGENTS_HOME/skills/$skill" ]] ||
    fail "Codex copy missing for $skill"
  [[ -d "$CLAUDE_CONFIG_DIR/skills/$skill" && ! -L "$CLAUDE_CONFIG_DIR/skills/$skill" ]] ||
    fail "Claude copy missing for $skill"
  diff -qr "$fixture_source/.agents/skills/$skill" "$AGENTS_HOME/skills/$skill" >/dev/null ||
    fail "Codex skill copy differs for $skill"
done

manifest="$AI_WORKFLOW_STATE_DIR/current.tsv"
[[ -f "$manifest" ]] || fail "installation manifest missing"
backup_file="$(find "$AI_WORKFLOW_STATE_DIR/backups" -type f -path '*/codex*/AGENTS.md' -print -quit)"
[[ -n "$backup_file" ]] || fail "original Codex instructions were not backed up"
assert_file_contains "$backup_file" "original codex instructions"

manifest_hash="$(sha256sum "$manifest" | awk '{print $1}')"
"$repo_root/scripts/install.sh" --source "$fixture_source" --agent all --mode copy
[[ "$(sha256sum "$manifest" | awk '{print $1}')" == "$manifest_hash" ]] ||
  fail "idempotent installation rewrote the manifest"

printf '\nUpdate fixture marker.\n' >>"$fixture_source/.agents/skills/pr-readiness/SKILL.md"
"$repo_root/scripts/install.sh" --source "$fixture_source" --agent all --mode copy
assert_file_contains "$AGENTS_HOME/skills/pr-readiness/SKILL.md" "Update fixture marker."
assert_file_contains "$backup_file" "original codex instructions"

printf '\nRollback fixture marker.\n' >>"$fixture_source/.agents/skills/pr-readiness/SKILL.md"
if AI_WORKFLOW_TEST_FAIL_AFTER=1 "$repo_root/scripts/install.sh" \
  --source "$fixture_source" --agent all --mode copy >/dev/null 2>&1; then
  fail "injected installer failure unexpectedly succeeded"
fi
if grep -Fq "Rollback fixture marker." "$AGENTS_HOME/skills/pr-readiness/SKILL.md"; then
  fail "failed installation did not roll back the changed target"
fi

dry_root="$test_root/dry run"
if HOME="$dry_root/home" \
  CODEX_HOME="$dry_root/codex" \
  AGENTS_HOME="$dry_root/agents" \
  CLAUDE_CONFIG_DIR="$dry_root/claude" \
  AI_WORKFLOW_STATE_DIR="$dry_root/state" \
  "$repo_root/scripts/install.sh" --source "$fixture_source" --dry-run >/dev/null; then
  [[ ! -e "$dry_root" ]] || fail "dry-run created target or state directories"
else
  fail "dry-run failed"
fi

if HOME="$test_root/root guard home" \
  CODEX_HOME="/" \
  AGENTS_HOME="$test_root/root guard agents" \
  CLAUDE_CONFIG_DIR="$test_root/root guard claude" \
  AI_WORKFLOW_STATE_DIR="$test_root/root guard state" \
  "$repo_root/scripts/install.sh" \
    --source "$fixture_source" --agent codex --dry-run >/dev/null 2>&1; then
  fail "installer accepted the filesystem root as an agent home"
fi

saved_pr_target="$test_root/pr-readiness-before-drift"
cp -a "$AGENTS_HOME/skills/pr-readiness" "$saved_pr_target"
printf '\nlocal drift\n' >>"$AGENTS_HOME/skills/pr-readiness/SKILL.md"
if "$repo_root/scripts/uninstall.sh" >/dev/null 2>&1; then
  fail "uninstall accepted a drifted managed target"
fi
rm -rf -- "$AGENTS_HOME/skills/pr-readiness"
cp -a "$saved_pr_target" "$AGENTS_HOME/skills/pr-readiness"

"$repo_root/scripts/uninstall.sh"
assert_file_contains "$CODEX_HOME/AGENTS.md" "original codex instructions"
[[ ! -e "$CLAUDE_CONFIG_DIR/CLAUDE.md" ]] ||
  fail "uninstall did not remove created Claude instructions"
for skill in ai-project-manager html-plan pr-readiness; do
  [[ ! -e "$AGENTS_HOME/skills/$skill" ]] || fail "Codex skill remained after uninstall: $skill"
  [[ ! -e "$CLAUDE_CONFIG_DIR/skills/$skill" ]] || fail "Claude skill remained after uninstall: $skill"
done

link_root="$test_root/link mode"
export HOME="$link_root/home"
export CODEX_HOME="$link_root/codex"
export AGENTS_HOME="$link_root/agents"
export CLAUDE_CONFIG_DIR="$link_root/claude"
export AI_WORKFLOW_STATE_DIR="$link_root/state"

"$repo_root/scripts/install.sh" --source "$fixture_source" --agent all --mode link
[[ -L "$AGENTS_HOME/skills/html-plan" ]] || fail "Codex link-mode skill is not a symlink"
[[ -L "$CLAUDE_CONFIG_DIR/skills/html-plan" ]] || fail "Claude link-mode skill is not a symlink"
[[ -f "$CODEX_HOME/AGENTS.md" && ! -L "$CODEX_HOME/AGENTS.md" ]] ||
  fail "rendered Codex instructions must not be symlinked"
printf '\nLink source changed after installation.\n' \
  >>"$fixture_source/.agents/skills/html-plan/SKILL.md"
"$repo_root/scripts/uninstall.sh"

external_root="$test_root/external equivalent"
export HOME="$external_root/home"
export CODEX_HOME="$external_root/codex"
export AGENTS_HOME="$external_root/agents"
export CLAUDE_CONFIG_DIR="$external_root/claude"
export AI_WORKFLOW_STATE_DIR="$external_root/state"
mkdir -p "$AGENTS_HOME/skills"
cp -a "$fixture_source/.agents/skills/html-plan" "$AGENTS_HOME/skills/html-plan"
"$repo_root/scripts/install.sh" --source "$fixture_source" --agent codex --mode copy
grep -Fq $'\texternal\t' "$AI_WORKFLOW_STATE_DIR/current.tsv" ||
  fail "equivalent unmanaged target was not recorded as external"
"$repo_root/scripts/uninstall.sh"
[[ -d "$AGENTS_HOME/skills/html-plan" ]] ||
  fail "uninstall removed an equivalent target it did not own"

split_root="$test_root/separate agent installs"
export HOME="$split_root/home"
export CODEX_HOME="$split_root/codex"
export AGENTS_HOME="$split_root/agents"
export CLAUDE_CONFIG_DIR="$split_root/claude"
export AI_WORKFLOW_STATE_DIR="$split_root/state"
"$repo_root/scripts/install.sh" --source "$fixture_source" --agent codex --mode copy
"$repo_root/scripts/install.sh" --source "$fixture_source" --agent claude --mode copy
[[ "$(awk -F '\t' '$1 == "entry" && $2 == "codex" { count++ } END { print count + 0 }' \
  "$AI_WORKFLOW_STATE_DIR/current.tsv")" -eq 4 ]] ||
  fail "separate Claude install discarded Codex manifest entries"
[[ "$(awk -F '\t' '$1 == "entry" && $2 == "claude" { count++ } END { print count + 0 }' \
  "$AI_WORKFLOW_STATE_DIR/current.tsv")" -eq 4 ]] ||
  fail "Claude manifest entries missing after separate install"
printf '\nSeparate update marker.\n' >>"$fixture_source/.agents/skills/ai-project-manager/SKILL.md"
"$repo_root/scripts/install.sh" --source "$fixture_source" --agent codex --mode copy
[[ "$(awk -F '\t' '$1 == "entry" && $2 == "claude" { count++ } END { print count + 0 }' \
  "$AI_WORKFLOW_STATE_DIR/current.tsv")" -eq 4 ]] ||
  fail "agent-specific update discarded the other agent's manifest entries"
"$repo_root/scripts/uninstall.sh"

printf 'installer integration tests passed\n'
