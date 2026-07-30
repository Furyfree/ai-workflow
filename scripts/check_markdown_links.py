#!/usr/bin/env python3
"""Check local Markdown links without fetching remote URLs."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    errors: list[str] = []

    for markdown in sorted(root.rglob("*.md")):
        if ".git" in markdown.parts:
            continue
        text = markdown.read_text(encoding="utf-8")
        for raw_target in LINK.findall(text):
            target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            path_text = unquote(target.split("#", 1)[0])
            linked = (markdown.parent / path_text).resolve()
            try:
                linked.relative_to(root)
            except ValueError:
                errors.append(f"{markdown.relative_to(root)}: link escapes repository: {target}")
                continue
            if not linked.exists():
                errors.append(f"{markdown.relative_to(root)}: missing link target: {target}")

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print("markdown link validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
