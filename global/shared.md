# Shared development agreements

Apply these defaults in every repository unless a more specific repository
instruction says otherwise.

## Start with context

- Find and follow repository instructions before planning or editing.
- Inspect the current branch, worktree, relevant documents, and existing
  validation.
- Before editing a Git repository, inspect the current branch, its base, name,
  and upstream state. Use a task-named branch based on the current default
  branch. If the current branch is the default branch, belongs to different
  work, or was deleted upstream, remind the user and create or switch branches
  only when the user or repository instructions authorize it.
- Follow the repository's existing architecture, code patterns, naming, tests,
  and style before introducing a new pattern.
- Treat existing user changes as intentional unless evidence shows otherwise.
- Surface conflicts between instructions, requirements, plans, and code.
- Resolve uncertainty by inspecting evidence. Say when a premise appears wrong,
  and ask only when plausible choices materially change the result.
- Do not assume arbitrary reference files are loaded automatically.

## Keep work controlled

- Use simple ASCII punctuation unless existing content or a file format requires
  otherwise.
- Make the smallest coherent change that satisfies the request.
- Keep repository-specific commands, architecture, and hazards in that
  repository.
- Do not add speculative dependencies, abstractions, or unrelated cleanup.
- Treat thousands of changed lines or a broad rewrite as a scope warning.
  Recheck the request and existing design unless an explicit end-to-end feature,
  migration, or rewrite justifies that size.
- Remove orphans created by the current change; leave unrelated dead code alone.
- Keep code, comments, and Markdown plain and proportional. Remove redundant
  wrappers, obvious comments, repeated explanations, excessive headings, and
  polished filler.
- Keep generated artifacts derived from canonical sources.
- Keep instruction files short. Add a rule only when it documents durable
  behavior or prevents a real repeat mistake.
- When a correction reveals a repeat mistake, tighten an existing rule instead
  of adding duplicate guidance.

## Protect the user

- Do not expose or add credentials, tokens, sessions, history, caches, logs,
  runtime databases, private runtime state, or secret values unless explicitly
  asked for a scoped local or private test. Do not publish them without separate
  explicit authorization.
- Do not edit live agent configuration, agent homes, authentication, or runtime
  state unless the user explicitly asks for that exact system-level change.
  Prefer changing the repository source and letting the user run installation.
- Resolve destructive targets exactly and prefer reversible operations.
- Keep commit, push, pull-request creation, merge, installation, deployment,
  privileged commands, and infrastructure apply behind explicit authorization.
- Treat edit requests, implementation requests, and "go ahead" as authorization
  for local work only. Require an explicit request before committing, pushing,
  opening a pull request, or adding commits to an existing pull request, even
  when tools are authenticated or approval rules allow the commands.
- Do not weaken trust, sandbox, approval, or permission settings implicitly.

## Validate and report honestly

- Run focused checks while iterating and the repository's complete local gate
  before reporting completion.
- Read complete errors and relevant logs before fixing their cause.
- Inspect the final diff and untracked files.
- Report exact commands, failures, skipped checks, and unavailable tools.
- Do not claim that CI, review, deployment, or external state passed without
  current evidence.

## Use reusable workflows

- Keep cross-repository workflows in skills and project-specific behavior in
  repository instructions.
- Use `ai-project-manager` for repository planning and document reconciliation.
- Use `pr-readiness` for local and pull-request evidence.
- Use `html-plan` only when a visual materially improves a broad plan.
- Use `subagent` for one bounded independent delegation, including an explicit
  Codex, Claude, or Grok provider when requested.
- Use `passthrough` for a current-agent repository-wide coherence pass.
- Use passthrough subagent or loop modes only when the user explicitly requests
  them.
