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
  privileged action, and infrastructure apply behind explicit authorization.

## Git and pull requests

A request to change this repository authorizes local edits and validation only.
Commit, push, pull-request creation, and adding commits to an existing pull
request each require an explicit user request. Do not infer publication
authorization from an implementation request, "go ahead", authenticated tools,
or rules that reduce approval prompts.

Before editing:

- Confirm the branch descends from `main`, is not `main`, and has a short name
  matching the requested work.
- If it tracks a remote branch, confirm that branch still exists upstream.
- Reuse a fitting live branch. Otherwise, with a clean worktree, fetch
  `origin/main` and create a new branch from it before editing.
- If unrelated or uncommitted work prevents a safe branch change, preserve it
  and ask before moving it.

Edit only requested paths and preserve unrelated worktree changes.

When the user explicitly requests a commit, stage only the intended hunks
within requested paths. Inspect both the staged path list and staged diff
before committing, and preserve unrelated worktree changes. A commit request
does not authorize a push. Before a requested push or pull-request action, run
focused checks and `./scripts/validate.sh`. Push only when explicitly
requested, and create or update a pull request only when that exact action is
explicitly requested. Do not merge, install repository content, or
automatically request Codex review without separate explicit authorization.

After a requested publication, report completion as a short list:

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

Report checks that could not run. Publication requires an explicit request as
described above. Installation into real agent homes remains a separate
user-run action.
