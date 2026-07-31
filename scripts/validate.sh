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
  "roadmap/forgejo-pr-review.md"
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
  private_match="$(
    find "$repo_root" -path "$repo_root/.git" -prune -o \
      -name "$private_name" -print -quit
  )"
  if [[ -n "$private_match" ]]; then
    fail "private runtime file found: $private_name"
  fi
done

expected_skills=(
  ai-project-manager
  html-plan
  local-pr-review
  passthrough
  pr-readiness
  subagent
)
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

review_contract_files=(
  "$repo_root/global/shared.md"
  "$repo_root/.agents/skills/pr-readiness/SKILL.md"
  "$repo_root/.agents/skills/ai-project-manager/assets/project/AGENTS.md"
  "$repo_root/README.md"
  "$repo_root/SPEC.md"
)
review_contract_phrases=(
  "hosted Codex review"
  "The only permitted manual hosted-review comment is exactly"
  "\`@codex review\`"
  "CodeRabbit is local-only"
  "authenticated local CLI"
  "through a GitHub comment, GitHub App, review request, check, or bot mention"
  "substitut"
  "local Codex review"
)

forbidden_coderabbit_comment="@coderabbit""ai review"

authorizes_coderabbit_github_clause() {
  local action_pattern
  local action_to_provider
  local action_words
  local negative_after_action
  local negative_before_action
  local negative_marker
  local provider_to_action
  local review_clause="${1,,}"
  local use_pattern

  action_words='allow(ed|ing|s)?|enable(d|ing|s)?|invoke(d|ing|s)?|permit(s|ted|ting)?|post(ed|ing|s)?|request(ed|ing|s)?|trigger(ed|ing|s)?'
  action_pattern="(^|[^[:alnum:]_])($action_words)([^[:alnum:]_]|$)"
  use_pattern='(^|[^[:alnum:]_])use(d|s|ing)?[[:space:]]+(the[[:space:]]+)?coderabbit'
  action_to_provider="(($action_words)[^,;.]*coderabbit|use(d|s|ing)?[[:space:]]+(the[[:space:]]+)?coderabbit)"
  provider_to_action="coderabbit[^,;.]*($action_words|use(d|s|ing)?)"
  negative_marker='do[[:space:]]+not|must[[:space:]]+not|never|forbid|prohibit'
  negative_before_action="(($negative_marker)[[:space:]]+(be[[:space:]]+)?$action_to_provider|coderabbit[^,;.]*($negative_marker)[[:space:]]+(be[[:space:]]+)?($action_words|use(d|s|ing)?))"
  negative_after_action="($action_to_provider|$provider_to_action)[^,;.]*(forbidden|not[[:space:]]+allowed|not[[:space:]]+permitted|prohibited)"

  [[ "$review_clause" == *coderabbit* ]] || return 1
  [[ "$review_clause" =~ (github|bot[[:space:]]+mention) ]] || return 1
  if [[ ! "$review_clause" =~ $action_pattern ]] &&
    [[ ! "$review_clause" =~ $use_pattern ]]; then
    return 1
  fi
  [[ ! "$review_clause" =~ $negative_before_action ]] &&
    [[ ! "$review_clause" =~ $negative_after_action ]]
}

contains_coderabbit_github_authorization() {
  local review_clause

  while IFS= read -r review_clause; do
    if authorizes_coderabbit_github_clause "$review_clause"; then
      return 0
    fi
  done < <(
    tr '.;,' '\n' <<<"$1" |
      sed -E 's/[[:space:]]+(and|but|however|then|yet)[[:space:]]+/\n/g'
  )
  return 1
}

contains_nonexact_codex_invocation() {
  local review_text="$1"

  review_text="${review_text//\`@codex review\`/}"
  grep -Fqi '@codex' <<<"$review_text"
}

contains_unapproved_coderabbit_comment() {
  local allowed_prohibition
  local review_text="${1,,}"

  allowed_prohibition="never post \`$forbidden_coderabbit_comment\`"
  review_text="${review_text//$allowed_prohibition/}"
  [[ "$review_text" == *"$forbidden_coderabbit_comment"* ]]
}

for file in "${review_contract_files[@]}"; do
  normalized_review_contract="$(
    awk '{$1 = $1; printf "%s ", $0}' "$file"
  )"
  for phrase in "${review_contract_phrases[@]}"; do
    grep -Fqi "$phrase" <<<"$normalized_review_contract" ||
      fail "${file#"$repo_root/"} does not preserve review-provider contract: $phrase"
  done

  if contains_nonexact_codex_invocation "$normalized_review_contract"; then
    fail "${file#"$repo_root/"} contains a non-exact Codex invocation"
  fi
  if contains_coderabbit_github_authorization "$normalized_review_contract"; then
    fail "${file#"$repo_root/"} authorizes CodeRabbit through GitHub"
  fi
  if contains_unapproved_coderabbit_comment "$normalized_review_contract"; then
    fail "${file#"$repo_root/"} authorizes a CodeRabbit GitHub trigger"
  fi
done

contains_coderabbit_github_authorization \
  "If the local CLI is unavailable, invoke CodeRabbit through a GitHub comment" ||
  fail "review validation accepts unavailable-provider substitution"
contains_coderabbit_github_authorization \
  "Never invoke Codex through GitHub, but invoke CodeRabbit through a GitHub comment" ||
  fail "review validation lets an unrelated negation authorize CodeRabbit"
if contains_coderabbit_github_authorization \
  "Never invoke CodeRabbit through a GitHub comment"; then
  fail "review validation rejects an explicit CodeRabbit GitHub prohibition"
fi

if contains_nonexact_codex_invocation "\`@codex review\`"; then
  fail "review validation rejects the exact Codex review invocation"
fi
contains_nonexact_codex_invocation "\`@codex fix\`" ||
  fail "review validation accepts an alternate Codex invocation"
contains_nonexact_codex_invocation "\`@codex review this PR\`" ||
  fail "review validation accepts an extended Codex invocation"

if contains_unapproved_coderabbit_comment \
  "Never post \`$forbidden_coderabbit_comment\`"; then
  fail "review validation rejects the CodeRabbit trigger prohibition"
fi
contains_unapproved_coderabbit_comment \
  "Do not post \`@codex review\`; post \`$forbidden_coderabbit_comment\`" ||
  fail "review validation lets an unrelated negation authorize CodeRabbit"

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
  check_allowed_rule "$rules_file" git ls-remote --exit-code --heads \
    origin chore/repository-foundation
  check_allowed_rule "$rules_file" gh pr view --json number,url
  check_allowed_rule "$rules_file" gh pr checks
  check_allowed_rule "$rules_file" bash -n scripts/install.sh
  check_allowed_rule "$rules_file" shellcheck scripts/install.sh
  check_unmatched_rule "$rules_file" git push
  check_unmatched_rule "$rules_file" gh pr create --fill --draft
  check_unmatched_rule "$rules_file" gh pr merge
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
  check_allowed_rule "$project_rules_file" gh pr view --json number,url
  check_allowed_rule "$project_rules_file" gh pr checks
  check_unmatched_rule "$project_rules_file" git fetch origin main
  check_unmatched_rule "$project_rules_file" git switch -c \
    chore/tighten-workflow origin/main
  check_unmatched_rule "$project_rules_file" git add -- AGENTS.md
  check_unmatched_rule "$project_rules_file" git add -- .
  check_unmatched_rule "$project_rules_file" git add .
  check_unmatched_rule "$project_rules_file" git add -A
  check_unmatched_rule "$project_rules_file" git commit -m "Update workflow"
  check_unmatched_rule "$project_rules_file" git commit -m "Update workflow" --all
  check_unmatched_rule "$project_rules_file" git push -u origin HEAD
  check_unmatched_rule "$project_rules_file" git push -u origin HEAD --force
  check_unmatched_rule "$project_rules_file" gh pr create --fill --draft
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
  git -C "$repo_root" status --short ||
    fail "git status inspection failed"
  git -C "$repo_root" diff --check || fail "git diff whitespace validation failed"
  git -C "$repo_root" diff --cached --check ||
    fail "staged diff whitespace validation failed"
else
  printf 'notice: Git worktree checks unavailable\n'
fi

if [[ $errors -gt 0 ]]; then
  printf 'validation failed with %d error(s)\n' "$errors" >&2
  exit 1
fi

printf 'validation passed: %d skills\n' "${#expected_skills[@]}"
