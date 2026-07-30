#!/usr/bin/env python3
"""Validate canonical skills and their realistic case inventories."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("missing opening frontmatter delimiter")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise ValueError("missing closing frontmatter delimiter") from exc

    values: dict[str, str] = {}
    for line in lines[1:end]:
        if ":" not in line:
            raise ValueError(f"invalid frontmatter line: {line}")
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip()
    return values, "\n".join(lines[end + 1 :])


def validate_skill(skill_dir: Path, cases_dir: Path) -> list[str]:
    errors: list[str] = []
    name = skill_dir.name
    skill_file = skill_dir / "SKILL.md"
    metadata_file = skill_dir / "agents" / "openai.yaml"
    case_file = cases_dir / f"{name}.json"

    if not skill_file.is_file():
        return [f"{name}: missing SKILL.md"]

    try:
        frontmatter, body = parse_frontmatter(skill_file)
    except (OSError, UnicodeError, ValueError) as exc:
        return [f"{name}: {exc}"]

    if set(frontmatter) != {"name", "description"}:
        errors.append(f"{name}: frontmatter must contain only name and description")
    if frontmatter.get("name") != name:
        errors.append(f"{name}: frontmatter name does not match directory")
    if not NAME.fullmatch(name) or len(name) > 63:
        errors.append(f"{name}: invalid skill name")
    description = frontmatter.get("description", "")
    if len(description) < 40:
        errors.append(f"{name}: description is too short to trigger reliably")
    if "TODO" in skill_file.read_text(encoding="utf-8"):
        errors.append(f"{name}: unresolved TODO marker")
    if len(body.splitlines()) > 500:
        errors.append(f"{name}: SKILL.md body exceeds 500 lines")

    if not metadata_file.is_file():
        errors.append(f"{name}: missing agents/openai.yaml")
    else:
        metadata = metadata_file.read_text(encoding="utf-8")
        for key in ("display_name", "short_description", "default_prompt"):
            if not re.search(rf"^\s*{key}:\s*\"[^\"]+\"\s*$", metadata, re.MULTILINE):
                errors.append(f"{name}: openai.yaml missing quoted {key}")
        if f"${name}" not in metadata:
            errors.append(f"{name}: default prompt must mention ${name}")

    if not case_file.is_file():
        errors.append(f"{name}: missing realistic case inventory")
    else:
        try:
            cases = json.loads(case_file.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"{name}: invalid case inventory: {exc}")
        else:
            if cases.get("skill") != name:
                errors.append(f"{name}: case inventory names another skill")
            for key in ("should_trigger", "should_not_trigger", "expected_behaviors"):
                values = cases.get(key)
                if not isinstance(values, list) or len(values) < 2:
                    errors.append(f"{name}: {key} needs at least two realistic cases")
                elif not all(isinstance(value, str) and value.strip() for value in values):
                    errors.append(f"{name}: {key} contains an empty or non-string case")

    return errors


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    skills_dir = root / ".agents" / "skills"
    cases_dir = root / "tests" / "skill-cases"
    errors: list[str] = []

    skill_dirs = sorted(path for path in skills_dir.iterdir() if path.is_dir())
    if not skill_dirs:
        errors.append("no canonical skills found")
    for skill_dir in skill_dirs:
        errors.extend(validate_skill(skill_dir, cases_dir))

    case_names = {path.stem for path in cases_dir.glob("*.json")}
    skill_names = {path.name for path in skill_dirs}
    for extra in sorted(case_names - skill_names):
        errors.append(f"case inventory has no matching skill: {extra}")

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"skill validation passed: {len(skill_dirs)} skills")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
