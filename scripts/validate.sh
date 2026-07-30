#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
errors=0

fail() {
  printf 'error: %s\n' "$1" >&2
  errors=$((errors + 1))
}

required_files=(
  ".github/dependabot.yml"
  ".github/pull_request_template.md"
  ".github/workflows/validate.yml"
  ".codex/rules/repository-pr.rules"
  ".agents/skills/ai-project-manager/assets/project/AGENTS.md"
  ".agents/skills/ai-project-manager/assets/project/CLAUDE.md"
  ".agents/skills/ai-project-manager/assets/project/ROADMAP.md"
  ".agents/skills/ai-project-manager/assets/project/SPEC.md"
  ".agents/skills/ai-project-manager/assets/project/TASKS.md"
  "AGENTS.md"
  "CLAUDE.md"
  "README.md"
  "ROADMAP.md"
  "SPEC.md"
  "TASKS.md"
  "codex/rules/ai-workflow.rules"
  "global/shared.md"
  "scripts/install.sh"
  "scripts/test-install.sh"
  "scripts/uninstall.sh"
  "scripts/validate.sh"
)

for file in "${required_files[@]}"; do
  [[ -f "$repo_root/$file" ]] || fail "missing $file"
done

for forbidden_file in \
  ".codex/config.toml" \
  "codex/ai-workflow-agent-files.toml"; do
  [[ ! -e "$repo_root/$forbidden_file" ]] ||
    fail "live permission-profile dependency found: $forbidden_file"
done

if grep -n -F 'config.toml' \
  "$repo_root/scripts/install.sh" \
  "$repo_root/scripts/uninstall.sh" \
  "$repo_root/scripts/test-install.sh" >/dev/null 2>&1; then
  fail "installer or installer tests reference live agent config.toml"
fi

if grep -R -n -E '\[TODO:|TODO_PLACEHOLDER' \
  --exclude-dir=.git --exclude=validate.sh "$repo_root" >/dev/null 2>&1; then
  fail "unresolved TODO marker found"
fi

for private_name in auth.json history.jsonl installation_id \
  '*.sqlite' '*.sqlite-shm' '*.sqlite-wal'; do
  if find "$repo_root" -path "$repo_root/.git" -prune -o \
    -name "$private_name" -print | grep -q .; then
    fail "private runtime file found: $private_name"
  fi
done

expected_skills=(ai-project-manager html-plan passthrough pr-readiness subagent)
actual_skills="$(
  find "$repo_root/.agents/skills" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' |
    LC_ALL=C sort
)"
expected_skill_list="$(printf '%s\n' "${expected_skills[@]}" | LC_ALL=C sort)"
[[ "$actual_skills" == "$expected_skill_list" ]] ||
  fail "canonical skill directories do not match the first-release inventory"

for skill in "${expected_skills[@]}"; do
  skill_file="$repo_root/.agents/skills/$skill/SKILL.md"
  metadata="$repo_root/.agents/skills/$skill/agents/openai.yaml"
  [[ -f "$skill_file" ]] || { fail "missing skill: $skill"; continue; }
  [[ "$(sed -n '1p' "$skill_file")" == "---" ]] ||
    fail "$skill has no frontmatter"
  [[ "$(sed -n '2p' "$skill_file")" == "name: $skill" ]] ||
    fail "$skill frontmatter name does not match"
  grep -q '^description: .\+' < <(sed -n '3p' "$skill_file") ||
    fail "$skill has no description"
  [[ "$(sed -n '4p' "$skill_file")" == "---" ]] ||
    fail "$skill frontmatter is not closed after its required fields"
  [[ -f "$metadata" ]] || fail "$skill has no UI metadata"
  [[ "$(sed -n '1p' "$metadata")" == "interface:" ]] ||
    fail "$skill UI metadata has no interface"
  grep -Eq '^  display_name: "[^"]+"$' "$metadata" ||
    fail "$skill UI metadata has no display name"
  grep -Eq '^  short_description: "[^"]+"$' "$metadata" ||
    fail "$skill UI metadata has no short description"
  grep -Eq '^  default_prompt: "[^"]+"$' "$metadata" ||
    fail "$skill UI metadata has no default prompt"
  grep -Fq "\$$skill" "$metadata" ||
    fail "$skill default prompt does not invoke the skill"
done

rules_file="$repo_root/codex/rules/ai-workflow.rules"
project_rules_file="$repo_root/.codex/rules/repository-pr.rules"
if command -v codex >/dev/null 2>&1; then
  check_allowed_rule() {
    local policy="$1"
    local result
    shift
    result="$(codex execpolicy check --rules "$policy" -- "$@")" || {
      fail "Codex rules failed to load: $policy"
      return
    }
    grep -Fq '"decision":"allow"' <<<"$result" ||
      fail "Codex rules did not allow: $*"
  }

  check_unmatched_rule() {
    local policy="$1"
    local result
    shift
    result="$(codex execpolicy check --rules "$policy" -- "$@")" || {
      fail "Codex rules failed to load: $policy"
      return
    }
    if grep -Fq '"decision":"allow"' <<<"$result"; then
      fail "Codex rules unexpectedly allowed: $*"
    fi
  }

  check_allowed_rule "$rules_file" ls -la
  check_allowed_rule "$rules_file" git status --short
  check_allowed_rule "$rules_file" git ls-files
  check_allowed_rule "$rules_file" bash -n scripts/install.sh
  check_allowed_rule "$rules_file" shellcheck scripts/install.sh
  check_unmatched_rule "$rules_file" git push
  check_unmatched_rule "$rules_file" git diff --stat --output=/tmp/example
  check_unmatched_rule "$rules_file" git log --oneline --output=/tmp/example
  check_unmatched_rule "$rules_file" file -C -m example.magic
  check_unmatched_rule "$rules_file" kubectl version --client --client=false
  check_unmatched_rule "$rules_file" bash -c command
  check_unmatched_rule "$rules_file" curl https://example.com
  check_unmatched_rule "$rules_file" rm -rf build
  check_unmatched_rule "$rules_file" tree -o /tmp/example .

  check_allowed_rule "$project_rules_file" git ls-remote --exit-code --heads \
    origin chore/tighten-workflow
  check_allowed_rule "$project_rules_file" git fetch origin main
  check_allowed_rule "$project_rules_file" git switch -c \
    chore/tighten-workflow origin/main
  check_allowed_rule "$project_rules_file" git add -- AGENTS.md
  check_allowed_rule "$project_rules_file" git add -- README.md scripts/install.sh
  check_allowed_rule "$project_rules_file" git commit -m "Update workflow"
  check_allowed_rule "$project_rules_file" git push -u origin HEAD
  check_allowed_rule "$project_rules_file" gh pr create --fill --draft
  check_allowed_rule "$project_rules_file" gh pr view --json number,url
  check_allowed_rule "$project_rules_file" gh pr checks
  check_unmatched_rule "$project_rules_file" git add .
  check_unmatched_rule "$project_rules_file" git add -A
  check_unmatched_rule "$project_rules_file" gh pr merge
else
  if [[ "${CI:-}" == "true" ]]; then
    fail "Codex unavailable in CI; policy validation did not run"
  else
    printf 'notice: Codex unavailable; policy validation skipped\n'
  fi
fi

bash -n "$repo_root"/scripts/*.sh || fail "Bash syntax validation failed"
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck "$repo_root"/scripts/*.sh || fail "ShellCheck failed"
elif [[ "${CI:-}" == "true" ]]; then
  fail "ShellCheck unavailable in CI"
else
  printf 'notice: ShellCheck unavailable; CI requires it\n'
fi

"$repo_root/scripts/test-install.sh" || fail "installer tests failed"

if git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$repo_root" diff --check || fail "git diff whitespace validation failed"
fi

if [[ $errors -gt 0 ]]; then
  printf 'validation failed with %d error(s)\n' "$errors" >&2
  exit 1
fi

printf 'validation passed: %d skills\n' "${#expected_skills[@]}"
