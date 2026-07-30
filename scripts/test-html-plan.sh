#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
validator="$repo_root/.agents/skills/html-plan/scripts/validate_html.py"

python3 "$validator" "$repo_root/tests/fixtures/html-plan/valid.html"
python3 "$validator" "$repo_root/.agents/skills/html-plan/assets/base.html"

if python3 "$validator" "$repo_root/tests/fixtures/html-plan/external-resource.html" >/dev/null 2>&1; then
  printf 'error: external-resource fixture unexpectedly passed\n' >&2
  exit 1
fi

printf 'html plan tests passed\n'
