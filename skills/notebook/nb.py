#!/usr/bin/env python3
"""Print a Jupyter notebook as compact Markdown: every cell, short outputs, no image data.

Usage: nb.py FILE.ipynb [--cells A-B] [--no-outputs] [--max-lines N] [--images DIR]
Standard library only.
"""

import argparse
import base64
import html
import json
import re
import sys
from pathlib import Path
from typing import cast

ANSI = re.compile(r"\x1b\[[0-9;]*m")
INLINE_IMAGE = re.compile(r"\(data:image/[^)]*\)")
HTML_NOISE = re.compile(r"<(script|style)\b.*?</\1>|<[^>]+>", re.S | re.I)


def text(value: str | list[str]) -> str:
    """Notebook strings are either one string or a list of lines."""
    return value if isinstance(value, str) else "".join(value)


def clip(s: str, max_lines: int, width: int = 300) -> str:
    lines = [
        line if len(line) <= width else line[:width] + " ..."
        for line in ANSI.sub("", s).rstrip().splitlines()
    ]
    if len(lines) > max_lines:
        lines = lines[:max_lines] + [f"... (+{len(lines) - max_lines} more lines)"]
    return "\n".join(lines)


def html_text(value: str | list[str]) -> str:
    """.NET kernels and some libraries give HTML only: keep its words, drop tags and scripts."""
    words = re.sub(r"[ \t]+", " ", html.unescape(HTML_NOISE.sub(" ", text(value))))
    return re.sub(r" ?\n\s*", "\n", words).strip()


def image(
    value: str | list[str], mime: str, stem: str, images: str | Path | None
) -> str:
    """Return a one-line placeholder; write the image to `images` when given."""
    ext = {"jpeg": "jpg", "svg+xml": "svg"}.get(mime.split("/")[1], mime.split("/")[1])
    raw = text(value).encode() if ext == "svg" else base64.b64decode(text(value))
    note = f"[image: {stem}, {ext}, {max(1, len(raw) // 1024)} KB"
    if images:
        path = Path(images) / f"{stem}.{ext}"
        path.write_bytes(raw)
        note += f", saved to {path}"
    return note + "]"


def cell_outputs(
    cell: dict[str, object], n: int, max_lines: int, images: str | Path | None
) -> list[str]:
    parts: list[str] = []
    for k, out in enumerate(cast(list[dict[str, object]], cell.get("outputs", [])), 1):
        kind = out.get("output_type")
        data = cast(dict[str, str | list[str]], out.get("data") or {})
        if kind == "stream":
            parts.append(
                clip(text(cast(str | list[str], out.get("text", ""))), max_lines)
            )
        elif kind == "error":
            parts.append(
                f"{out.get('ename')}: {ANSI.sub('', cast(str, out.get('evalue', '')))}"
            )
        else:
            # SymPy ships a picture of the formula next to its LaTeX: the LaTeX is enough
            pictures = [
                m for m in data if m.startswith("image/") and "text/latex" not in data
            ]
            parts += [image(data[m], m, f"cell{n}-out{k}", images) for m in pictures]
            for mime in ("text/latex", "text/markdown", "text/plain"):
                # text/plain next to a picture is only "<Figure size ...>"
                if mime in data and not (mime == "text/plain" and pictures):
                    parts.append(clip(text(data[mime]), max_lines))
                    break
            else:
                words = html_text(data["text/html"]) if "text/html" in data else ""
                if words:
                    parts.append(clip(words, max_lines))
                elif not pictures:
                    parts.append(f"[output: {', '.join(data) or kind}]")
    return [p for p in parts if p]


def render(
    nb: dict[str, object],
    cells: tuple[int, int] | None = None,
    outputs: bool = True,
    max_lines: int = 20,
    images: str | Path | None = None,
) -> str:
    metadata = cast(dict[str, object], nb.get("metadata", {}))
    info = cast(dict[str, str], metadata.get("language_info") or {})
    default = (info.get("pygments_lexer") or info.get("name") or "python").lower()
    lines: list[str] = []
    for n, cell in enumerate(cast(list[dict[str, object]], nb.get("cells", [])), 1):
        source = text(cast(str | list[str], cell.get("source", "")))
        if (cells and not cells[0] <= n <= cells[1]) or not source.strip():
            continue
        if cell.get("cell_type") == "code":
            meta = cast(dict[str, dict[str, str]], cell.get("metadata") or {})
            lang = (
                (meta.get("vscode") or {}).get("languageId")
                or (meta.get("polyglot_notebook") or {}).get("kernelName")
                or default
            )
            lang = "python" if lang.startswith("ipython") else lang
            lines += [f"[cell {n}]", f"```{lang}", source.rstrip(), "```"]
            found = cell_outputs(cell, n, max_lines, images) if outputs else []
            if found:
                lines += ["Output:", *found]
        else:
            lines += [
                f"[cell {n}] {cell.get('cell_type')}",
                INLINE_IMAGE.sub("(inline image removed)", source.rstrip()),
            ]
            attachments = cast(
                dict[str, dict[str, str | list[str]]], cell.get("attachments") or {}
            )
            for name, kinds in attachments.items():
                for mime, value in kinds.items():
                    lines.append(
                        image(value, mime, f"cell{n}-{Path(name).stem}", images)
                    )
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=cast(str, __doc__).splitlines()[0])
    ap.add_argument("file")
    ap.add_argument("--cells", help="one cell or a range, 1-based: 12 or 10-20")
    ap.add_argument("--no-outputs", action="store_true", help="code and text only")
    ap.add_argument(
        "--max-lines", type=int, default=20, help="lines kept per output (default 20)"
    )
    ap.add_argument(
        "--images", metavar="DIR", help="write plots and pasted images here as files"
    )
    a = ap.parse_args()
    cells = None
    if a.cells:
        first, _, last = a.cells.partition("-")
        cells = (int(first), int(last or first))
    if a.images:
        Path(a.images).mkdir(parents=True, exist_ok=True)
    try:
        nb = json.loads(Path(a.file).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        sys.exit(f"nb.py: cannot read {a.file}: {e}")
    total = len(nb.get("cells", []))
    print(f"# {a.file} ({total} cells)\n")
    print(render(nb, cells, not a.no_outputs, a.max_lines, a.images))


if __name__ == "__main__":
    main()
