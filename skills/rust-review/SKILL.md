---
name: rust-review
description: >
  Review existing Rust code, a crate, a .rs file, or a Rust diff and report
  what to change. Use for "review this Rust", "what is wrong with my Rust",
  "is this idiomatic Rust", "check this crate", "gennemgå Rust-koden", or
  "er det her god Rust".
  Not for writing or changing Rust (rust-best-practices) or second opinions
  from other models (validate).
---

# Rust review

Resolve this file's symlinks first; paths below are relative to its real
directory. Read the [upstream skill](../../vendor/rust-review/SKILL.md)
and use its guidance with these local exceptions, which take precedence
over conflicting upstream instructions:

- Report only. Never edit the reviewed code unless asked.
- Never install Rust toolchains or components. If `cargo` is missing, say so
  and review by reading.
- The rules live in [rust-best-practices](../../vendor/rust-best-practices/SKILL.md)
  and its `references/`. Read only those needed for a finding.
- Never suggest a new crate as a fix without saying it adds a dependency.
- Offer the lints in one line at most, linking the pinned
  [lints.toml](https://github.com/morganlinton/BeautifulRust/blob/0e3c2224644cfcab963dfa6941139238291375ea/lints/lints.toml).
- Use [Testing](../testing/SKILL.md) for findings about tests.
