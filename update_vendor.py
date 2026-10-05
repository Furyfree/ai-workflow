#!/usr/bin/env python3
"""Update vendored skills; review git diff vendor/ before keeping changes."""

import argparse
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass, replace
from pathlib import Path, PurePosixPath
from urllib.parse import urlencode


@dataclass(frozen=True)
class Source:
    name: str
    repo: str
    path: str
    commit: str
    license: str

    def line(self) -> str:
        return (
            "\t".join((self.name, self.repo, self.path, self.commit, self.license))
            + "\n"
        )


def read_sources(path: Path) -> list[str | Source]:
    entries: list[str | Source] = []
    names: set[str] = set()
    for number, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(keepends=True), 1
    ):
        value = line.rstrip("\r\n")
        if not value or value.startswith("#"):
            entries.append(line)
            continue
        fields = value.split("\t")
        if len(fields) != 5 or not all(fields):
            raise ValueError(
                f"vendor/SOURCES:{number}: need 5 nonempty tab-separated fields"
            )
        source = Source(*fields)
        relative = PurePosixPath(source.path)
        if (
            not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]*", source.name)
            or source.name in names
            or not re.fullmatch(r"[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+", source.repo)
            or relative.is_absolute()
            or ".." in relative.parts
            or "\\" in source.path
            or not re.fullmatch(r"[0-9a-fA-F]{40}", source.commit)
        ):
            raise ValueError(f"vendor/SOURCES:{number}: invalid or duplicate source")
        names.add(source.name)
        entries.append(source)
    return entries


def latest_commit(source: Source) -> str:
    query = {"per_page": "1"}
    if source.path != ".":
        query["path"] = source.path
    result = subprocess.run(
        [
            "gh",
            "api",
            f"repos/{source.repo}/commits?{urlencode(query)}",
            "-q",
            ".[0].sha",
        ],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
        timeout=120,
    )
    commit = result.stdout.strip()
    if not re.fullmatch(r"[0-9a-fA-F]{40}", commit):
        raise ValueError(f"invalid upstream commit for {source.name}")
    return commit


def stage_skill(source: Source, workspace: Path) -> Path:
    directory = workspace / "downloads" / source.name
    directory.mkdir(parents=True)
    archive = directory / "archive.tar.gz"
    with archive.open("wb") as output:
        subprocess.run(
            ["gh", "api", f"repos/{source.repo}/tarball/{source.commit}"],
            check=True,
            stdout=output,
            timeout=120,
        )
    unpacked = directory / "unpacked"
    unpacked.mkdir()
    with tarfile.open(archive, "r:gz") as bundle:
        bundle.extractall(unpacked, filter="data")
    roots = list(unpacked.iterdir())
    if len(roots) != 1 or roots[0].is_symlink() or not roots[0].is_dir():
        raise ValueError(f"invalid upstream archive for {source.name}")
    selected = roots[0] / source.path
    if not (selected / "SKILL.md").is_file():
        raise ValueError(f"missing SKILL.md for {source.name}")
    staged = directory / "skill"
    if source.path == ".":
        staged.mkdir()
        for name in ("SKILL.md", "references", "scripts", "LICENSE"):
            item = selected / name
            target = staged / name
            if item.is_symlink():
                target.symlink_to(item.readlink())
            elif item.is_dir():
                shutil.copytree(item, target, symlinks=True)
            elif item.is_file():
                shutil.copy2(item, target)
    else:
        shutil.copytree(selected, staged, symlinks=True)
    if not (staged / "SKILL.md").is_file():
        raise ValueError(f"unreadable staged SKILL.md for {source.name}")
    return staged


def apply_updates(
    vendor: Path, workspace: Path, updates: list[tuple[Source, Path]], contents: str
) -> None:
    if not updates:
        return
    sources = workspace / "SOURCES"
    sources.write_text(contents, encoding="utf-8")
    previous = workspace / "previous"
    previous.mkdir()
    replaced: list[tuple[Path, Path | None]] = []
    try:
        for source, staged in updates:
            target = vendor / source.name
            backup = None
            if target.exists() or target.is_symlink():
                backup = previous / source.name
                target.rename(backup)
            replaced.append((target, backup))
            staged.rename(target)
        sources.replace(vendor / "SOURCES")
    except BaseException:
        for target, backup in reversed(replaced):
            if target.is_symlink():
                target.unlink()
            elif target.is_dir():
                shutil.rmtree(target)
            if backup is not None:
                backup.rename(target)
        raise


def update(vendor: Path) -> None:
    entries = read_sources(vendor / "SOURCES")
    # Keep staging and backups on the vendor filesystem for directory renames.
    with tempfile.TemporaryDirectory(prefix=".update-", dir=vendor) as directory:
        workspace = Path(directory)
        updates: list[tuple[Source, Path]] = []
        lines: list[str] = []
        for entry in entries:
            if isinstance(entry, str):
                lines.append(entry)
                continue
            commit = latest_commit(entry)
            updated = replace(entry, commit=commit)
            if commit == entry.commit:
                print(f"up to date: {entry.name}")
            else:
                updates.append((updated, stage_skill(updated, workspace)))
            lines.append(updated.line())
        apply_updates(vendor, workspace, updates, "".join(lines))
        for source, _ in updates:
            original = next(
                entry
                for entry in entries
                if isinstance(entry, Source) and entry.name == source.name
            )
            print(
                f"updated:    {source.name}  {original.commit[:12]} -> {source.commit[:12]}"
            )


def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()
    update(Path(__file__).resolve().parent / "vendor")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError, tarfile.TarError) as error:
        sys.exit(f"update_vendor.py: {error}")
