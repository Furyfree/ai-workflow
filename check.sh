#!/usr/bin/env bash
# Check structure, shell syntax, notebook parsing, CLI workflows, and Pi extensions.
# Line counts are aims: going over only prints a note.
set -euo pipefail
shopt -s nullglob
cd "$(dirname "${BASH_SOURCE[0]}")"
fail=0
aim() { # aim <file> <lines>: a note, never a failure
  local n; n=$(wc -l <"$1")
  if ((n > $2)); then echo "note: $1 has $n lines (aim: $2)"; fi
}
aim rules.md 40; aim README.md 60; aim AGENTS.md 40; aim install.sh 50; aim update-vendor.sh 40
for f in skills/*/SKILL.md; do aim "$f" 80; done
for f in skills/*/SKILL.md vendor/*/SKILL.md; do
  d="${f%/SKILL.md}"
  grep -qx "name: ${d##*/}" "$f" || { echo "$f: name does not match its directory"; fail=1; }
done
for f in skills/*/SKILL.md; do # a wrapper must still find its upstream skill
  while IFS= read -r p; do
    [[ -e "${f%/*}/$p" ]] || { echo "$f: missing $p"; fail=1; }
  done < <(grep -o '\.\./\.\./vendor/[^)]*' "$f")
done
awk -F'\t' '!/^#/ && NF && NF != 5 {print "vendor/SOURCES: need 5 fields: " $0; bad = 1} END {exit bad}' vendor/SOURCES || fail=1
for d in vendor/*/; do
  d="${d%/}"; grep -q "^${d##*/}	" vendor/SOURCES || { echo "$d: not listed in vendor/SOURCES"; fail=1; }
done
for f in install.sh check.sh update-vendor.sh skills/*/*.sh extensions/*.sh; do bash -n "$f" || fail=1; done
if command -v shellcheck >/dev/null; then shellcheck install.sh check.sh update-vendor.sh skills/*/*.sh extensions/*.sh || fail=1; fi
python3 skills/notebook/nb.py --selftest >/dev/null || { echo "nb.py selftest failed"; fail=1; }
bash skills/subagent/test.sh || fail=1
bash extensions/test.sh || fail=1
exit "$fail"
