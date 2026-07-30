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
dry_output="$(
  HOME="$dry_root/home" CODEX_HOME="$dry_root/codex" \
    AGENTS_HOME="$dry_root/agents" CLAUDE_CONFIG_DIR="$dry_root/claude" \
    AI_WORKFLOW_STATE_DIR="$dry_root/state" \
    "$repo_root/scripts/install.sh" --source "$fixture" --dry-run
)"
[[ ! -e "$dry_root" ]] || fail "dry-run created target or state directories"
grep -Fqx "dry-run complete: all unchanged" <<<"$dry_output" ||
  fail "dry-run did not report that all targets remained unchanged"
if grep -Fq "installation complete" <<<"$dry_output"; then
  fail "dry-run reported a completed installation"
fi
if grep -Fq "optional CodeRabbit CLI setup" <<<"$dry_output"; then
  fail "dry-run printed post-install setup guidance"
fi

argument_error="$test_root/argument-error.log"
for option in --agent --source --state-dir; do
  if "$repo_root/scripts/install.sh" "$option" \
    >"$argument_error" 2>&1; then
    fail "install accepted a missing value for $option"
  fi
  grep -Fqx "error: $option requires a value" "$argument_error" ||
    fail "install did not explain the missing value for $option"
done
for option in --agent --state-dir; do
  if "$repo_root/scripts/uninstall.sh" "$option" \
    >"$argument_error" 2>&1; then
    fail "uninstall accepted a missing value for $option"
  fi
  grep -Fqx "error: $option requires a value" "$argument_error" ||
    fail "uninstall did not explain the missing value for $option"
done

alias_root="$test_root/source-target alias"
alias_source="$alias_root/source"
alias_error="$alias_root/error.log"
mkdir -p "$alias_root"
cp -a "$fixture" "$alias_source"
if HOME="$alias_root/home" CODEX_HOME="$alias_root/codex" \
  AGENTS_HOME="$alias_source/.agents" \
  CLAUDE_CONFIG_DIR="$alias_root/claude" \
  AI_WORKFLOW_STATE_DIR="$alias_root/state" \
  "$repo_root/scripts/install.sh" --source "$alias_source" \
    --agent codex >"$alias_error" 2>&1; then
  fail "install accepted a source-target alias"
fi
grep -Fq "install target aliases source" "$alias_error" ||
  fail "source-target alias failure was not explained"
for skill in "$alias_source"/.agents/skills/*; do
  [[ -d "$skill" && ! -L "$skill" ]] ||
    fail "source-target alias changed a source skill"
done
[[ ! -e "$alias_root/codex" && ! -e "$alias_root/state/codex.tsv" ]] ||
  fail "source-target alias changed install targets or state"

rollback_root="$test_root/rollback"
rollback_log="$rollback_root/install.log"
mkdir -p "$rollback_root/codex"
printf 'rollback original\n' >"$rollback_root/codex/AGENTS.md"
printf 'block rules directory\n' >"$rollback_root/codex/rules"
if HOME="$rollback_root/home" CODEX_HOME="$rollback_root/codex" \
  AGENTS_HOME="$rollback_root/agents" \
  CLAUDE_CONFIG_DIR="$rollback_root/claude" \
  AI_WORKFLOW_STATE_DIR="$rollback_root/state" \
  "$repo_root/scripts/install.sh" --source "$fixture" \
    --agent codex >"$rollback_log" 2>&1; then
  fail "install succeeded despite a blocked target parent"
fi
grep -Fq \
  "backup: $rollback_root/codex/AGENTS.md -> $rollback_root/state/backups/codex-" \
  "$rollback_log" ||
  fail "rollback did not reach the first target mutation"
[[ -f "$rollback_root/codex/AGENTS.md" &&
  ! -L "$rollback_root/codex/AGENTS.md" ]] ||
  fail "original instructions were not restored as a regular file"
grep -Fqx "rollback original" "$rollback_root/codex/AGENTS.md" ||
  fail "failed install did not restore the original instructions"
[[ -f "$rollback_root/codex/rules" &&
  ! -L "$rollback_root/codex/rules" ]] ||
  fail "blocking path was changed"
grep -Fqx "block rules directory" "$rollback_root/codex/rules" ||
  fail "failed install changed the blocking path"
[[ ! -e "$rollback_root/state/codex.tsv" ]] ||
  fail "failed install left a completed manifest"

mkdir -p "$CODEX_HOME"
printf 'original codex instructions\n' >"$CODEX_HOME/AGENTS.md"
mkdir -p "$CODEX_HOME/rules"
printf 'original codex rules\n' >"$CODEX_HOME/rules/ai-workflow.rules"
mkdir -p "$CLAUDE_CONFIG_DIR"
printf 'original claude instructions\n' >"$CLAUDE_CONFIG_DIR/CLAUDE.md"
mkdir -p "$AGENTS_HOME/skills"
ln -s "../../source/.agents/skills/passthrough" \
  "$AGENTS_HOME/skills/passthrough"

isolated_bin="$test_root/isolated-bin"
mkdir -p "$isolated_bin"
for command_name in \
  awk basename bash cat cmp date dirname grep head ln mkdir mktemp mv \
  readlink rm; do
  command_path="$(command -v "$command_name")" ||
    fail "test dependency missing: $command_name"
  ln -s "$command_path" "$isolated_bin/$command_name"
done

install_output="$(
  PATH="$isolated_bin" "$repo_root/scripts/install.sh" --source "$fixture"
)"
grep -Fqx "  curl -fsSL https://cli.coderabbit.ai/install.sh | sh" \
  <<<"$install_output" ||
  fail "install did not print setup for a missing CodeRabbit CLI"
grep -Fqx "  coderabbit auth status --agent" <<<"$install_output" ||
  fail "install did not print authentication after CodeRabbit setup"

fake_bin="$test_root/fake-bin"
mkdir -p "$fake_bin"
# The single-quoted values below are source for the generated fake CLI.
# shellcheck disable=SC2016
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  "[[ \"\${1:-}:\${2:-}:\${3:-}\" == \"auth:status:--agent\" ]] || exit 2" \
  'case "${FAKE_CODERABBIT_AUTHENTICATED:-false}" in' \
  '  true|false)' \
  '    printf "{\"authenticated\":%s}\n" "$FAKE_CODERABBIT_AUTHENTICATED"' \
  '    ;;' \
  '  error) exit 2 ;;' \
  '  *) printf "unexpected fake auth state\n" >&2; exit 2 ;;' \
  'esac' \
  >"$fake_bin/coderabbit"
chmod +x "$fake_bin/coderabbit"

unauthenticated_output="$(
  PATH="$fake_bin:$isolated_bin" FAKE_CODERABBIT_AUTHENTICATED=false \
    "$repo_root/scripts/install.sh" --source "$fixture"
)"
if grep -Fq "curl -fsSL" <<<"$unauthenticated_output"; then
  fail "install printed CodeRabbit setup for an installed CLI"
fi
grep -Fqx "CodeRabbit CLI authentication required:" \
  <<<"$unauthenticated_output" ||
  fail "install did not report missing CodeRabbit authentication"

authenticated_output="$(
  PATH="$fake_bin:$isolated_bin" FAKE_CODERABBIT_AUTHENTICATED=true \
    "$repo_root/scripts/install.sh" --source "$fixture"
)"
if grep -Fq "CodeRabbit" <<<"$authenticated_output"; then
  fail "install printed CodeRabbit guidance for an authenticated CLI"
fi

status_error_output="$(
  PATH="$fake_bin:$isolated_bin" FAKE_CODERABBIT_AUTHENTICATED=error \
    "$repo_root/scripts/install.sh" --source "$fixture"
)"
grep -Fqx "CodeRabbit CLI authentication status unavailable:" \
  <<<"$status_error_output" ||
  fail "install did not distinguish a failed CodeRabbit status check"
if grep -Fq "coderabbit auth login" <<<"$status_error_output"; then
  fail "install recommended login after a failed CodeRabbit status check"
fi

assert_link "$CODEX_HOME/AGENTS.md" "$fixture/global/shared.md"
assert_link "$CODEX_HOME/rules/ai-workflow.rules" \
  "$fixture/codex/rules/ai-workflow.rules"
assert_link "$CLAUDE_CONFIG_DIR/CLAUDE.md" "$fixture/global/shared.md"
for skill in ai-project-manager html-plan local-pr-review pr-readiness subagent; do
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
for skill in ai-project-manager html-plan local-pr-review passthrough pr-readiness subagent; do
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
