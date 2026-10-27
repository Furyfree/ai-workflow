---
name: rust-best-practices
description: >
  Write, change, or debug Rust code, crates, Cargo.toml, tests, or rustdoc.
  Use for "write this in Rust", "fix this Rust code", "add a Rust test",
  "set up a Rust project", "skriv det i Rust", "ret Rust-koden", or
  "lav et Rust-projekt".
  Not for reviewing Rust without changes (rust-review), porting other
  languages (rust-port), or passing mentions of Rust with no code.
---

# Rust best practices

Resolve this file's symlinks first; paths below are relative to its real
directory. Read the [upstream skill](../../vendor/rust-best-practices/SKILL.md)
and use its guidance with these local exceptions, which take precedence
over conflicting upstream instructions:

- Standard library first. Never add a crate (`anyhow`, `thiserror`,
  `bitflags`, `tracing`, `derive_more`, an allocator) or split code into a
  workspace without asking.
- Never install Rust toolchains or components. If `cargo` is missing, tell
  the user and skip the cargo checks.
- When a project has no `[lints]` table, offer once to copy
  [lints.toml](https://github.com/morganlinton/BeautifulRust/blob/58757ee890da9b3c8d5b785adc7a8d53cce27307/lints/lints.toml)
  and [clippy.toml](https://github.com/morganlinton/BeautifulRust/blob/58757ee890da9b3c8d5b785adc7a8d53cce27307/lints/clippy.toml)
  from that pinned commit. Never fetch from another commit.
- Use [Testing](../testing/SKILL.md) when choosing verification or writing
  or reviewing tests. Its guidance takes precedence over upstream testing
  advice.

Resolve upstream reference paths from the upstream skill's directory. Read
only those needed for the task; do not copy them here.
