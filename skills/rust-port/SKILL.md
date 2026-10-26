---
name: rust-port
description: >
  Port code from C, C++, Python, Go, JavaScript, or TypeScript to Rust with
  the same behaviour. Use for "port this to Rust", "rewrite this in Rust",
  "what would this look like in Rust", "move this module to Rust",
  "omskriv det til Rust", or "port det til Rust".
  Not for writing new Rust (rust-best-practices) or reviewing Rust
  (rust-review).
---

# Rust port

Resolve this file's symlinks first; paths below are relative to its real
directory. Read the [upstream skill](../../vendor/rust-port/SKILL.md)
and use its guidance with these local exceptions, which take precedence
over conflicting upstream instructions:

- List `PORTING.md`, the Rust files, and any crates in the plan, and wait
  for approval before creating them.
- Standard library first. Never add a crate without asking.
- Never install Rust toolchains or components. If `cargo` is missing, tell
  the user and skip the cargo checks.
- Follow [rust-best-practices](../rust-best-practices/SKILL.md) for the
  style of the Rust itself.
- Use [Testing](../testing/SKILL.md) when porting or writing tests.
