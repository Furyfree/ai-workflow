#!/usr/bin/env python3
"""Validate the portable contract for an html-plan artifact."""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


class PlanParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.errors: list[str] = []
        self.has_html_lang = False
        self.has_charset = False
        self.has_viewport = False
        self.has_main = False
        self.h1_count = 0
        self.in_title = False
        self.title_text: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {name.lower(): value or "" for name, value in attrs}
        tag = tag.lower()

        if tag == "html" and values.get("lang", "").strip():
            self.has_html_lang = True
        elif tag == "meta":
            if values.get("charset", "").lower() == "utf-8":
                self.has_charset = True
            if (
                values.get("name", "").lower() == "viewport"
                and "width=device-width" in values.get("content", "").lower()
            ):
                self.has_viewport = True
        elif tag == "main":
            self.has_main = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "title":
            self.in_title = True

        resource_attribute = {
            "script": "src",
            "img": "src",
            "source": "src",
            "video": "src",
            "audio": "src",
            "iframe": "src",
            "object": "data",
        }.get(tag)
        if resource_attribute and values.get(resource_attribute):
            self._check_resource(tag, values[resource_attribute])

        if tag == "link" and values.get("rel", "").lower() == "stylesheet":
            self._check_resource(tag, values.get("href", ""))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_text.append(data)

    def _check_resource(self, tag: str, value: str) -> None:
        parsed = urlparse(value)
        if parsed.scheme in {"http", "https"} or value.startswith("//"):
            self.errors.append(f"external required resource: <{tag}> {value}")
        elif value and not value.startswith(("data:", "#")):
            self.errors.append(f"non-embedded required resource: <{tag}> {value}")


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return [f"cannot read UTF-8 HTML: {exc}"]

    if not re.match(r"\s*<!doctype html>", text, re.IGNORECASE):
        errors.append("missing HTML5 doctype")

    parser = PlanParser()
    try:
        parser.feed(text)
        parser.close()
    except Exception as exc:  # HTMLParser exposes parsing failures as exceptions.
        errors.append(f"HTML parser failed: {exc}")

    errors.extend(parser.errors)
    if not parser.has_html_lang:
        errors.append("missing non-empty html lang attribute")
    if not parser.has_charset:
        errors.append("missing UTF-8 charset meta tag")
    if not parser.has_viewport:
        errors.append("missing responsive viewport meta tag")
    if not parser.has_main:
        errors.append("missing main landmark")
    if parser.h1_count != 1:
        errors.append(f"expected exactly one h1, found {parser.h1_count}")
    if not "".join(parser.title_text).strip():
        errors.append("missing non-empty title")

    css_urls = re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", text, re.IGNORECASE)
    for value in css_urls:
        if not value.startswith(("data:", "#")):
            errors.append(f"non-embedded CSS resource: {value}")

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {Path(sys.argv[0]).name} FILE.html", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    errors = validate(path)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"html plan validation passed: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
