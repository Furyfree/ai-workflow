#!/usr/bin/env bash
# Link rules.md, skills, and Pi extensions into the agent homes. --uninstall
# removes them. Only touches links that point into this repository. --force
# also replaces anything else in the way: a foreign link is removed (its old
# target is printed), a real file or folder is moved to a backup folder,
# never deleted.
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

# Skills. Local names override vendor names, and a vendor skill a local
# skill links to is reached only through it. Claude needs its own links.
for s in "$repo"/skills/*/ "$repo"/vendor/*/; do
  s="${s%/}" n="${s##*/}"
  if [[ "$s" == "$repo/vendor/"* ]] && { [[ -f "$repo/skills/$n/SKILL.md" ]] ||
    grep -qF "../../vendor/$n/" "$repo"/skills/*/SKILL.md; }; then
    for l in "$HOME/.agents/skills/$n" "$HOME/.claude/skills/$n"; do
      if [[ -L "$l" && "$(readlink "$l")" == "$s" ]]; then rm "$l"; echo "pruned: $l"; fi
    done
    continue
  fi
  link "$s" "$HOME/.agents/skills/$n"
  if [[ -d "$HOME/.claude" ]]; then link "$s" "$HOME/.claude/skills/$n"; fi
done

# Pi extensions, only when Pi is installed.
if [[ -d "$HOME/.pi/agent" ]]; then
  for e in "$repo"/extensions/pi/*.ts; do link "$e" "$HOME/.pi/agent/extensions/${e##*/}"; done
fi

# Links left behind by a skill or extension deleted from this repository.
for l in "$HOME"/.agents/skills/* "$HOME"/.claude/skills/* "$HOME"/.pi/agent/extensions/*; do
  if [[ -L "$l" && ! -e "$l" && "$(readlink "$l")" == "$repo"/* ]]; then rm "$l"; echo "pruned: $l"; fi
done
