# Shared development agreements

Apply these defaults in every repository unless a more specific repository
instruction says otherwise.

## Start with context

- Find and follow repository instructions before planning or editing.
- Inspect the current branch, worktree, relevant documents, and existing
  validation.
- Treat existing user changes as intentional unless evidence shows otherwise.
- Surface conflicts between instructions, requirements, plans, and code.

## Keep work controlled

- Make the smallest coherent change that satisfies the request.
- Keep repository-specific commands, architecture, and hazards in that
  repository.
- Do not add speculative dependencies, abstractions, or unrelated cleanup.
- Keep generated artifacts derived from canonical sources.

## Protect the user

- Never expose credentials, tokens, private runtime state, or secret values.
- Resolve destructive targets exactly and prefer reversible operations.
- Keep commit, push, pull-request creation, merge, installation, deployment,
  privileged commands, and infrastructure apply behind explicit authorization.
- Do not weaken trust, sandbox, approval, or permission settings implicitly.

## Validate and report honestly

- Run focused checks while iterating and the repository's complete local gate
  before reporting completion.
- Inspect the final diff and untracked files.
- Report exact commands, failures, skipped checks, and unavailable tools.
- Do not claim that CI, review, deployment, or external state passed without
  current evidence.

## Use reusable workflows

- Use `ai-project-manager` for repository planning and document reconciliation.
- Use `pr-readiness` for local and pull-request evidence.
- Use `html-plan` only when a visual materially improves a broad plan.
