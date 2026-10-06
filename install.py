#!/usr/bin/env python3
"""Link rules, skills, and Pi extensions into coding agent homes."""

import argparse
import os
import shutil
import tempfile
from collections.abc import Iterator
from datetime import datetime
from itertools import chain
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    flags = parser.add_mutually_exclusive_group()
    flags.add_argument(
        "--force",
        action="store_true",
        help="replace conflicts; back up real files and folders",
    )
    flags.add_argument(
        "--uninstall", action="store_true", help="remove only this repository's links"
    )
    return parser.parse_args()


def ours(target: Path, repo: Path) -> bool:
    source = target.readlink()
    return source.is_absolute() and Path(os.path.normpath(source)).is_relative_to(repo)


def link(
    source: Path,
    target: Path,
    *,
    repo: Path,
    home: Path,
    force: bool,
    uninstall: bool,
    backup: Path | None,
) -> Path | None:
    if target.is_symlink() and ours(target, repo):
        target.unlink()
    elif target.is_symlink() or (
        target.exists() and (not target.is_file() or target.stat().st_size > 0)
    ):
        if not force:
            hint = "" if uninstall else " (--force replaces it)"
            print(f"skip, not ours: {target}{hint}")
            return backup
        if target.is_symlink():
            print(f"replaced link: {target} (was -> {target.readlink()})")
            target.unlink()
        else:
            if backup is None:
                root = home / ".local/state/ai-workflow-backup"
                root.mkdir(parents=True, exist_ok=True)
                backup = Path(
                    tempfile.mkdtemp(
                        prefix=datetime.now().strftime("%Y%m%d-%H%M%S-"), dir=root
                    )
                )
            saved = backup / target.relative_to(home)
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(target, saved)
            print(f"backed up: {target} -> {saved}")
    if uninstall:
        return backup
    target.parent.mkdir(parents=True, exist_ok=True)
    target.unlink(missing_ok=True)  # Empty agent-created placeholder files.
    target.symlink_to(source)
    print(f"linked: {target}")
    return backup


def rule_links(repo: Path, home: Path) -> Iterator[tuple[Path, Path]]:
    # Grok reads Claude's global rules file.
    for name in (
        ".claude/CLAUDE.md",
        ".codex/AGENTS.md",
        ".config/opencode/AGENTS.md",
        ".pi/agent/AGENTS.md",
    ):
        target = home / name
        if target.parent.is_dir():
            yield repo / "rules.md", target


def skill_links(repo: Path, home: Path) -> Iterator[tuple[Path, Path]]:
    """Yield active links and prune vendor links reached through local wrappers."""
    wrappers = "\n".join(
        skill.read_text(encoding="utf-8")
        for skill in sorted((repo / "skills").glob("*/SKILL.md"))
        if not skill.parent.name.startswith(".")
    )
    for directory in ("skills", "vendor"):
        for source in sorted((repo / directory).glob("*")):
            if not source.is_dir() or source.name.startswith("."):
                continue
            name = source.name
            targets = [home / ".agents/skills" / name, home / ".claude/skills" / name]
            if directory == "vendor" and (
                (repo / "skills" / name / "SKILL.md").is_file()
                or f"../../vendor/{name}/" in wrappers
            ):
                for target in targets:
                    if target.is_symlink() and target.readlink() == source:
                        target.unlink()
                        print(f"pruned: {target}")
                continue
            yield source, targets[0]
            if (home / ".claude").is_dir():
                yield source, targets[1]


def extension_links(repo: Path, home: Path) -> Iterator[tuple[Path, Path]]:
    target = home / ".pi/agent/extensions"
    if target.parent.is_dir():
        for source in sorted((repo / "extensions").glob("*.ts")):
            if source.is_file() and not source.name.startswith("."):
                yield source, target / source.name


def prune_links(repo: Path, home: Path) -> None:
    # Include old role links when pruning deleted sources.
    for directory in (
        ".agents/skills",
        ".claude/skills",
        ".pi/agent/extensions",
        ".pi/agent/agents",
    ):
        for target in sorted((home / directory).glob("*")):
            if target.is_symlink() and not target.exists() and ours(target, repo):
                target.unlink()
                print(f"pruned: {target}")


def main() -> None:
    args = parse_args()
    repo = Path(__file__).resolve().parent
    home = Path(os.environ["HOME"]).absolute()
    backup = None
    for source, target in chain(
        rule_links(repo, home), skill_links(repo, home), extension_links(repo, home)
    ):
        backup = link(
            source,
            target,
            repo=repo,
            home=home,
            force=args.force,
            uninstall=args.uninstall,
            backup=backup,
        )
    prune_links(repo, home)


if __name__ == "__main__":
    main()
