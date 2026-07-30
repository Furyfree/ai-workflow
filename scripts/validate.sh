#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_containers=0
errors=0

usage() {
  cat <<'EOF'
Usage: scripts/validate.sh [--containers]

Runs the canonical repository validation gate. Pass --containers to also run
the selected Linux distribution images.
EOF
}

while (($#)); do
  case "$1" in
    --containers) run_containers=1 ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'error: unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

fail() {
  printf 'error: %s\n' "$1" >&2
  errors=$((errors + 1))
}

required_files=(
  ".dockerignore"
  ".github/dependabot.yml"
  ".github/pull_request_template.md"
  ".github/workflows/validate.yml"
  "AGENTS.md"
  "CLAUDE.md"
  "README.md"
  "ROADMAP.md"
  "SPEC.md"
  "TASKS.md"
  "containers/debian.Dockerfile"
  "containers/fedora.Dockerfile"
  "containers/ubuntu.Dockerfile"
  "docs/AGENT-PATHS.md"
  "docs/DECISIONS.md"
  "docs/GITHUB.md"
  "docs/IMPLEMENTATION.md"
  "docs/INSTALLATION.md"
  "docs/SKILLS.md"
  "docs/WORKFLOW.md"
  "global/adapters/claude.md"
  "global/adapters/codex.md"
  "global/shared.md"
  "scripts/check_markdown_links.py"
  "scripts/install.sh"
  "scripts/test-containers.sh"
  "scripts/test-html-plan.sh"
  "scripts/test-install.sh"
  "scripts/uninstall.sh"
  "scripts/validate.sh"
  "scripts/validate_skills.py"
)

for relative in "${required_files[@]}"; do
  [[ -f "$repo_root/$relative" ]] || fail "missing $relative"
done

if rg -n '\[TODO:|TODO_PLACEHOLDER' \
  "$repo_root" \
  --glob '!.git/**' \
  --glob '!scripts/validate.sh' >/dev/null 2>&1; then
  fail "unresolved template TODO marker found"
fi

for private_name in \
  auth.json history.jsonl installation_id \
  '*.sqlite' '*.sqlite-shm' '*.sqlite-wal'; do
  if find "$repo_root" -path "$repo_root/.git" -prune -o -name "$private_name" -print |
    grep -q .; then
    fail "private runtime file found: $private_name"
  fi
done

if git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git -C "$repo_root" ls-files |
    grep -Eq '(^|/)(auth\.json|history\.jsonl|installation_id|.*\.sqlite(-shm|-wal)?)$'; then
    fail "tracked private agent runtime file detected"
  fi
fi

if ! bash -n "$repo_root"/scripts/*.sh; then
  fail "Bash syntax validation failed"
fi

if command -v shellcheck >/dev/null 2>&1; then
  if ! shellcheck "$repo_root"/scripts/*.sh; then
    fail "ShellCheck failed"
  fi
else
  printf 'notice: ShellCheck unavailable; CI requires it\n'
fi

if ! python3 -m py_compile \
  "$repo_root/scripts/check_markdown_links.py" \
  "$repo_root/scripts/validate_skills.py" \
  "$repo_root/.agents/skills/html-plan/scripts/validate_html.py"; then
  fail "Python syntax validation failed"
fi

if ! python3 "$repo_root/scripts/check_markdown_links.py" "$repo_root"; then
  fail "Markdown link validation failed"
fi

if ! python3 "$repo_root/scripts/validate_skills.py" "$repo_root"; then
  fail "skill validation failed"
fi

# The sed expression is intentionally literal.
# shellcheck disable=SC2016
documented_skills="$(
  sed -n '/^## Installed skills$/,/^## /p' "$repo_root/docs/SKILLS.md" |
    sed -n 's/^- `\([^`]*\)`$/\1/p' |
    LC_ALL=C sort
)"
actual_skills="$(
  find "$repo_root/.agents/skills" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' |
    LC_ALL=C sort
)"
if [[ "$documented_skills" != "$actual_skills" ]]; then
  fail "docs/SKILLS.md does not match the canonical skill directories"
fi

if ! "$repo_root/scripts/test-html-plan.sh"; then
  fail "HTML plan tests failed"
fi

if ! "$repo_root/scripts/test-install.sh"; then
  fail "installer integration tests failed"
fi

if git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git -C "$repo_root" diff --check; then
    fail "git diff whitespace validation failed"
  fi
fi

if [[ $run_containers -eq 1 ]]; then
  if ! "$repo_root/scripts/test-containers.sh"; then
    fail "Linux distribution container tests failed"
  fi
fi

if [[ $errors -gt 0 ]]; then
  printf 'validation failed with %d error(s)\n' "$errors" >&2
  exit 1
fi

skill_count="$(find "$repo_root/.agents/skills" -mindepth 1 -maxdepth 1 -type d | wc -l)"
printf 'validation passed: %d skills checked\n' "$skill_count"
