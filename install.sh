#!/usr/bin/env bash
# Link rules.md and every skill into the agent homes. --uninstall removes them.
# Only touches links that point into this repository. --force also replaces
# anything else in the way: a foreign link is removed (its old target is
# printed), a real file or folder is moved to a backup folder, never deleted.
# ponytail: bash is enough for symlinks; move to Python if this ever has to
# edit JSON or TOML agent config.
set -euo pipefail
shopt -s nullglob
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
undo=false force=false
if (($# > 1)); then echo "usage: install.sh [--force | --uninstall]" >&2; exit 2; fi
case "${1:-}" in
  "") ;;
  --uninstall) undo=true ;;
  --force) force=true ;;
  *) echo "usage: install.sh [--force | --uninstall]" >&2; exit 2 ;;
esac
# Outside the skill folders, or agents would load a backed-up skill twice. Only
# $HOME decides where, so a test with HOME set to a temp directory stays there.
backup="$HOME/.local/state/ai-workflow-backup/$(date +%Y%m%d-%H%M%S)"

link() { # link <source> <target>
  local src="$1" dst="$2"
  if [[ -L "$dst" && "$(readlink "$dst")" == "$repo"/* ]]; then
    rm "$dst"
  elif [[ -L "$dst" || -s "$dst" || -d "$dst" ]]; then
    if ! $force; then
      echo "skip, not ours: $dst$($undo || echo ' (--force replaces it)')"; return
    elif [[ -L "$dst" ]]; then
      echo "replaced link: $dst (was -> $(readlink "$dst"))"; rm "$dst"
    else
      mkdir -p "$backup/$(dirname "${dst#"$HOME"/}")"
      mv "$dst" "$backup/${dst#"$HOME"/}"
      echo "backed up: $dst -> $backup/${dst#"$HOME"/}"
    fi
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

# Skills. Local names override vendor names; Claude needs its own links.
for s in "$repo"/skills/*/ "$repo"/vendor/*/; do
  s="${s%/}"
  if [[ "$s" == "$repo/vendor/"* && -f "$repo/skills/${s##*/}/SKILL.md" ]]; then continue; fi
  link "$s" "$HOME/.agents/skills/${s##*/}"
  if [[ -d "$HOME/.claude" ]]; then link "$s" "$HOME/.claude/skills/${s##*/}"; fi
done

# Links left behind by a skill that was deleted from this repository.
for l in "$HOME"/.agents/skills/* "$HOME"/.claude/skills/*; do
  if [[ -L "$l" && ! -e "$l" && "$(readlink "$l")" == "$repo"/* ]]; then rm "$l"; echo "pruned: $l"; fi
done
