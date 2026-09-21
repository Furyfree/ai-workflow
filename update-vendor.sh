#!/usr/bin/env bash
# Fetch the newest upstream version of every skill in vendor/SOURCES.
# Replaces vendor/<name> and the commit in SOURCES. Never commits: a skill is
# a prompt every agent obeys, so read `git diff vendor/` before keeping it.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

while IFS= read -r line <&3; do
  if [[ -z "$line" || "$line" == \#* ]]; then echo "$line" >>"$tmp/SOURCES"; continue; fi
  IFS=$'\t' read -r name repo path pinned license <<<"$line"
  if [[ -z "$license" ]]; then echo "vendor/SOURCES: need 5 tab-separated fields: $line" >&2; exit 1; fi
  query="per_page=1"
  if [[ "$path" != . ]]; then query="path=$path&$query"; fi
  new="$(gh api "repos/$repo/commits?$query" -q '.[0].sha')"
  if [[ "$new" == "$pinned" ]]; then
    echo "up to date: $name"
  else
    mkdir "$tmp/$name"
    gh api "repos/$repo/tarball/$new" | tar -xz -C "$tmp/$name" --strip-components=1
    rm -rf "vendor/$name"
    if [[ "$path" == . ]]; then # a skill at the repo root: take the skill files only
      mkdir "vendor/$name"
      for f in SKILL.md references scripts LICENSE; do
        if [[ -e "$tmp/$name/$f" ]]; then cp -r "$tmp/$name/$f" "vendor/$name/"; fi
      done
    else
      cp -r "$tmp/$name/$path" "vendor/$name"
    fi
    echo "updated:    $name  ${pinned:0:12} -> ${new:0:12}"
  fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$repo" "$path" "$new" "$license" >>"$tmp/SOURCES"
done 3<vendor/SOURCES
cp "$tmp/SOURCES" vendor/SOURCES
