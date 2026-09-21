---
name: lean-docs
description: Write or cut repository docs - AGENTS.md, CLAUDE.md, README. Use when the user says "write an AGENTS.md", "update AGENTS.md", "debloat the docs", "README is too long", "shorten the README", "clean up the docs", "README er for lang", "gør README kortere", "ryd op i docs". Not for writing code comments or release notes.
---

# Lean docs

The whole set for most repositories:

- `README.md`: what it is and how to use it. For people.
- `AGENTS.md`: the map for agents, below.
- `CLAUDE.md` and any other agent file: one line, `@AGENTS.md`.

A large active project may keep one behaviour spec and one TASKS file with
open items only. Ask before adding either.

## AGENTS.md is a map

Write it so an agent that has never seen the repository knows where to edit.
Aim for under 60 lines, and go over when the lines are needed. Use this order
and skip a section with nothing real in it:

    # <project>
    <What it is and who uses it, two or three sentences.>

    ## What must not break
    <The few things users rely on. Non-goals: what this will not become.>

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
