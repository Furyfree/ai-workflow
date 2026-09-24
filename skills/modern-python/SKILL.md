---
name: modern-python
description: >
  Write, change, or review Python, including scripts and tests in mixed
  repositories. Use for "write a Python script", "fix this Python code",
  "review Python", "set up Python tooling", "skriv et Python-script",
  or "ret Python-koden".
  Not for configuration-only changes that involve no Python work.
---

# Modern Python

Resolve this file's symlinks first; paths below are relative to its real
directory. Read the [upstream skill](../../vendor/modern-python/SKILL.md)
and use its guidance with these local exceptions, which take precedence
over conflicting upstream instructions:

- Apply relevant Python guidance in any repository, including mixed repos.
  Do not apply upstream's exclusion based on the repository's main language.
- Scope tooling to the task. Preserve appropriate existing tooling for script
  edits; use upstream setup guidance for new Python projects or requested
  tooling changes. Editing Python alone does not justify a migration,
  dependency, package layout, or new toolchain.
- For new data classes, use `@dataclass(frozen=True)` unless the object must
  change after creation. Never convert existing classes unless asked.
- Use [Testing](../testing/SKILL.md) when choosing verification or writing
  or reviewing tests. Its guidance takes precedence over upstream testing
  advice, including coverage quotas and blanket replacement of unittest.

Resolve upstream reference and template paths from the upstream skill's
directory. Read only those needed for the task; do not copy them here.
