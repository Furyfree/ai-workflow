# Repository instructions

## Scope

This repository owns portable coding-agent instructions, seven reusable skills,
project templates, a small Codex command policy, and a Linux installer for
Codex and Claude Code.

## Repository-specific boundaries

- Change repository sources only. Do not run real installation or uninstall
  against active agent homes while maintaining this repository.
- Keep shared instructions agent-neutral and put tool-specific policy in the
  relevant skill, rules file, or other clearly scoped source.
- Base task branches on `main` and use short names matching the requested work.

## Git and pull requests

- Follow the global authorization boundaries without broadening them.
- For a requested commit, stage only intended paths and inspect the staged
  diff.
- Before a requested commit, push, pull-request creation, or pull-request
  update, run focused checks, `./scripts/validate.sh`, and `pr-readiness`.
- Keep hosted and local review lifecycle policy in the relevant skills rather
  than duplicating it here.

After a requested publication, report completion as a short list:

- pull request number and URL
- branch and commit
- checks that passed
- actionable review findings, naming each problem and its disposition
- unavailable or skipped evidence

## Document ownership

- `SPEC.md`: requirements and boundaries
- `ROADMAP.md`: phase order and exit criteria
- `roadmap/<topic>.md`: research and decisions for one linked complex phase
- `TASKS.md`: current work and validation status
- `README.md`: installation, recovery, validation, and the public overview
- A skill's `SKILL.md`: that reusable workflow

Do not create additional planning or implementation documents when one of these
files already owns the information. A roadmap detail file is an exception only
when `ROADMAP.md` links it and the phase cannot stay concise without it.

## Editing

- Use plain Markdown and simple ASCII punctuation.
- Keep project-specific commands and requirements out of global instructions.
- Keep generated HTML derived from canonical Markdown.
- Prefer instructions over scripts unless deterministic automation is needed.
- Update the specification, roadmap, and tasks together when their shared
  contract changes.
- Do not mark work complete before its evidence passes.

## Code Review Rules

### Documentation contracts

- Review changed documentation and instructions as first-class behavior. Flag
  claims, commands, paths, authorization boundaries, or recovery guidance that
  contradict the implementation or would materially mislead an operator.
- Leave spelling, formatting, and other deterministic Markdown checks to local
  validation unless they change meaning.

## Validation

Run `./scripts/validate.sh` after changing instructions, skills, templates,
installation, validation, or repository layout. Also inspect:

```sh
git status --short
git diff --check
git diff --cached --check
```

Report checks that could not run.
