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
- Select skills from the current request. A skill used for an earlier request
  does not remain active unless the new request independently matches it.
- Use `ai-project-manager` when the user asks for repository foundations,
  onboarding, planning, or document reconciliation.
- Use `pr-readiness` before a requested pull-request creation or update, before
  committing further work to an existing pull request, or for an explicit
  merge-readiness check.
- Use `local-pr-review` only when the user asks for a local review or
  `pr-readiness` needs one full-severity fallback. Do not duplicate a current
  full-severity review. Post local findings to GitHub only when the user
  explicitly requests the comment.
- Treat hosted review as hosted Codex review only. The only permitted manual
  hosted-review comment is exactly `@codex review`. An explicit request to
  create a pull request authorizes that comment only when Codex GitHub review is
  configured and available, unless the user opts out. If it is unavailable,
  report that state and do not substitute another provider. Never infer another
  trigger from a commit, push, or update to an existing pull request, and never
  put the invocation in a pull-request title or body.
- CodeRabbit is local-only and may run only through its authenticated local CLI.
  Never invoke CodeRabbit through a GitHub comment, GitHub App, review request,
  check, or bot mention. Never post `@coderabbitai review`. Local CodeRabbit and
  local Codex review are separate local evidence; neither consumes or
  impersonates hosted Codex review.
- Prefer a draft-first pull-request flow. After approved findings are fixed,
  validate the final head and wait for CI without requesting another hosted
  Codex review. Ask before marking the draft ready or merging, and do not
  duplicate review automation that the ready transition may trigger.
- Bound each pull-request cycle to one hosted Codex review, at most two local
  CodeRabbit CLI runs, and at most one full local fallback. After approved local
  findings, verify the exact fix diff and complete local gate instead of
  starting another full review. Start a new cycle only for substantive new
  scope and after user direction.
- After an authorized hosted Codex review trigger is accepted, return control
  to the user. Do not wait for completion or poll; inspect the result when the
  user returns after review.
- When final CI passes, the review budget is complete, and only explicit human
  actions remain, include commands labelled for after merge that use the
  resolved base remote, base branch, and topic branch. Switch to and
  fast-forward the base, delete the local topic with `-d`, then prune. Do not
  run cleanup without an explicit request and confirmed merge, substitute
  `-D`, or delete a remote branch without separate authorization.
- Use `html-plan` when the user asks for HTML or a visual materially improves a
  broad plan or explanation.
- Before starting multiple substantive independent outcomes, use `subagent` to
  propose dependency-aware assignments and ask whether the user wants
  delegation. Use the current native model when none is selected. Keep ordered
  dependency chains with the main agent, and review and refine every delegated
  edit before final validation.
- Use `passthrough` only when the user asks for a passthrough, full repository
  audit, coherence pass, or repository-wide cleanup.
- Use passthrough subagent or loop modes only when the user explicitly requests
  them.
