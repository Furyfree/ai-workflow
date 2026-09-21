#!/usr/bin/env bash
# Fails when the repository regrows: line budgets, skill names, shellcheck.
set -euo pipefail
shopt -s nullglob
cd "$(dirname "${BASH_SOURCE[0]}")"
fail=0
budget() { # budget <file> <max lines>
  local n; n=$(wc -l <"$1")
  if ((n > $2)); then echo "$1: $n lines, budget $2"; fail=1; fi
}
budget rules.md 40; budget README.md 60; budget AGENTS.md 40; budget install.sh 50
for f in skills/*/SKILL.md; do budget "$f" 80; done
for f in skills/*/SKILL.md vendor/*/SKILL.md; do
  d="${f%/SKILL.md}"
  grep -qx "name: ${d##*/}" "$f" || { echo "$f: name does not match its directory"; fail=1; }
done
if command -v shellcheck >/dev/null; then shellcheck install.sh check.sh skills/*/*.sh || fail=1; fi
exit "$fail"
