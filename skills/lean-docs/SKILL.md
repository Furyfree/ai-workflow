---
name: lean-docs
description: Create, review or cut repository docs - AGENTS.md, CLAUDE.md, README. Use when the user says "write an AGENTS.md", "review AGENTS.md", "update AGENTS.md", "skriv en AGENTS.md", "debloat the docs", "README is too long", "shorten the README", "clean up the docs", "README er for lang", "gør README kortere", "ryd op i docs". Not for writing code comments or release notes.
---

# Lean docs

The whole set for most repositories:

- `README.md`: what it is and how to use it. For people.
- `AGENTS.md`: purpose, priorities and a working guide for agents.
- `CLAUDE.md`: one line, `@AGENTS.md`.

A large active project may keep one behaviour spec and one TASKS file with
open items only. Ask before adding either.

## Creating or reviewing agent files

- Read existing instructions, README, entry points, relevant code and check
  commands. Separate the maintainer's intent from current implementation.
- Establish what the project is for, who uses it and what changes must preserve.
  Ask one focused question when intent or a trade-off is unclear.
- Do not invent goals, supported platforms, production status or policies.
  Scaffolds and old plans do not establish support.
- Use [T3 Code's guide](https://github.com/pingdotgg/t3code/blob/main/AGENTS.md)
  as a purpose-first reference, not a template to copy. Keep this repository's
  constraints; do not import another project's rules.
- Propose the files and content before creating or rewriting them. Wait for
  approval; a review request grants no edit permission.
- Check paths, commands and links against the repository. Check that
  `CLAUDE.md` contains only `@AGENTS.md`. Do not activate live systems to
  verify documentation.

## AGENTS.md explains purpose before layout

Explain what the maintainer wants and what must stay good before giving the
map. Include their project-specific approach when it affects decisions.
Aim for under 60 lines, and go over when the lines are needed. Use this order
and skip a section with nothing real in it:

    # <project>
    <What it is for, who uses it and the intended outcome, two or three sentences.>

    ## What must not break
    <The few things users rely on. Non-goals: what this will not become.>

    ## Approach
    <Maintainer preferences and trade-offs specific to this project, if needed.>

    ## Map
    - `cmd/`: entry points. A new subcommand starts here.
    - `internal/boot/`: bootloader logic. Touch for GRUB or Plymouth changes.
    - `packaging/*.spec`: bump the version here and in `version.go`.

    ## Ways to hurt yourself
    - <A real hazard with the safe alternative, such as a live database path.>

    ## Verify
    <The smallest command that proves a change. What not to run, and why.>

    ## Git
    When I ask for a commit, it goes on <branch>. <Only if true: uses PRs.>

Every map line names a path and says what to change there. Leave out
anything an agent can see by listing the directory, general coding advice,
and whatever the global rules already say.

## Never write. In a cleanup, propose cutting

- evidence, completion-rule, exit-criteria, or residual-risk sections
- completed checkboxes and done lists; Git has them
- per-release verification logs; release notes have them
- "this file owns ..." preambles, glossaries of ordinary words, docs about docs
- plans, research, and roadmaps for work that stopped or never started
- the same rule or fact in a second file; link to the first
- prose that restates what a config file or the code already says

## Cutting an existing repository

Count lines per doc. List the cuts as a numbered list with lines saved. Wait
for answers by number, then edit. Git is the archive; move nothing to an
archive folder unless asked.
