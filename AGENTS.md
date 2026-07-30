# Repository instructions

## Scope

This repository owns portable coding-agent instructions, five reusable skills,
project templates, a small Codex command policy, and a Linux installer for
Codex and Claude Code.

Keep shared instructions agent-neutral. Put tool-specific policy in clearly
scoped files, and never use it to bypass explicit authorization boundaries.

## Working rules

- Inspect the branch, worktree, relevant documents, and existing validation
  before editing.
- Preserve unrelated user changes.
- Keep one coherent outcome per change.
- Prefer the smallest implementation that meets accepted requirements.
- Do not add automation for hypothetical future needs.
- Never fabricate files, output, tests, commits, or review state.
- Keep credentials and private agent runtime state out of the repository.
- Never edit active agent homes or live configuration such as
  `~/.codex/config.toml`, `~/.claude/`, or `~/.agents/` while maintaining this
  repository. Change repository sources only. Installation is a separate
  user-run action.
- Keep commit, push, pull-request creation, merge, installation, deployment,
  privileged action, and infrastructure apply behind explicit authorization,
  except for the repository pull-request workflow below.

## Repository pull requests

A request to change this repository is standing authorization to create a
fitting branch, commit the requested repository changes, push, and open a draft
pull request. It is not authorization to merge or install anything.

Before editing:

- Confirm the branch descends from `main`, is not `main`, and has a short name
  matching the requested work.
- If it tracks a remote branch, confirm that branch still exists upstream.
- Reuse a fitting live branch. Otherwise, with a clean worktree, fetch
  `origin/main` and create a new branch from it before editing.
- If unrelated or uncommitted work prevents a safe branch change, preserve it
  and ask before moving it.

Edit and stage only requested paths. Preserve and exclude unrelated worktree
changes, then inspect the staged path list before committing.

Run focused checks and `./scripts/validate.sh`, push with
`git push -u origin HEAD`, and create a draft pull request with
`gh pr create --fill --draft`. Do not merge it, install repository content, or
automatically request Codex review.

Report completion as a short list:

- pull request number and URL
- branch and commit
- checks that passed
- unavailable or skipped evidence

## Document ownership

- `SPEC.md`: requirements and boundaries
- `ROADMAP.md`: phase order and exit criteria
- `TASKS.md`: current work and validation status
- `README.md`: installation, recovery, validation, and the public overview
- A skill's `SKILL.md`: that reusable workflow

Do not create additional planning or implementation documents when one of these
files already owns the information.

## Editing

- Use plain Markdown and simple ASCII punctuation.
- Keep project-specific commands and requirements out of global instructions.
- Keep generated HTML derived from canonical Markdown.
- Prefer instructions over scripts unless deterministic automation is needed.
- Update the specification, roadmap, and tasks together when their shared
  contract changes.
- Do not mark work complete before its evidence passes.

## Validation

Run `./scripts/validate.sh` after changing instructions, skills, templates,
installation, validation, or repository layout. Also inspect:

```sh
git status --short
git diff --check
```

Report checks that could not run. Draft publication follows the standing
repository workflow above. Installation into real agent homes remains a
separate user-run action.
