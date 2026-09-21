#!/usr/bin/env bash
# Link rules.md and every skill into the agent homes. --uninstall removes them.
# Only touches links that point into this repository.
# ponytail: bash is enough for symlinks; move to Python if this ever has to
# edit JSON or TOML agent config.
set -euo pipefail
shopt -s nullglob
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-}" in
  "") undo=false ;;
  --uninstall) undo=true ;;
  *) echo "usage: install.sh [--uninstall]" >&2; exit 2 ;;
esac

link() { # link <source> <target>
  local src="$1" dst="$2"
  if [[ -L "$dst" ]]; then
    if [[ "$(readlink "$dst")" != "$repo"/* ]]; then echo "skip, not ours: $dst"; return; fi
    rm "$dst"
  elif [[ -s "$dst" || -d "$dst" ]]; then
    echo "skip, not ours: $dst"; return
  fi
  if $undo; then return; fi
  mkdir -p "$(dirname "$dst")"
  rm -f "$dst" # an empty placeholder file, such as a 0-byte ~/.codex/AGENTS.md
  ln -s "$src" "$dst"
  echo "linked: $dst"
}

# Rules, for each agent whose home exists. Grok reads ~/.claude/CLAUDE.md.
for t in .claude/CLAUDE.md .codex/AGENTS.md .config/opencode/AGENTS.md .pi/agent/AGENTS.md; do
  if [[ -d "$HOME/${t%/*}" ]]; then link "$repo/rules.md" "$HOME/$t"; fi
done

# Skills. ~/.agents/skills serves OpenCode, Codex, Grok, and Pi; Claude needs its own.
for s in "$repo"/skills/*/ "$repo"/vendor/*/; do
  s="${s%/}"
  link "$s" "$HOME/.agents/skills/${s##*/}"
  if [[ -d "$HOME/.claude" ]]; then link "$s" "$HOME/.claude/skills/${s##*/}"; fi
done

# Links left behind by a skill that was deleted from this repository.
for l in "$HOME"/.agents/skills/* "$HOME"/.claude/skills/*; do
  if [[ -L "$l" && ! -e "$l" && "$(readlink "$l")" == "$repo"/* ]]; then rm "$l"; echo "pruned: $l"; fi
done
