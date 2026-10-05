# Wanted Pi extensions

No implementations here yet. Start from existing tools and upstream examples.

## Upstream examples

Sources are pinned to Pi v1.0.3.

| Extension | Purpose |
| --- | --- |
| [Question](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/question.ts) | Ask one question with choices and a custom answer. |
| [Subagent](https://github.com/earendil-works/pi/tree/v1.0.3/packages/coding-agent/examples/extensions/subagent) | Delegate single, parallel, or chained tasks. |
| [Notify](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/notify.ts) | Terminal notification when Pi finishes. |
| [Bookmark](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/bookmark.ts) | Label useful points in the conversation tree. |
| [Handoff](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/handoff.ts) | Review a context summary before starting a new session. |
| [GitHub issues](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/github-issue-autocomplete.ts) | Complete issue references with number and title. |
| [Permission gate](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/permission-gate.ts) | Confirm selected dangerous commands; not a sandbox. |
| [Preset](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/preset.ts) | Switch model, reasoning, tools, and instructions together. |
| [Plan mode](https://github.com/earendil-works/pi/tree/v1.0.3/packages/coding-agent/examples/extensions/plan-mode) | Read-only exploration with plan and progress tracking. |

## Additional ideas

| Extension | Purpose and starting point |
| --- | --- |
| Fast mode | Request `service_tier: "priority"` for `openai-codex/gpt-6.1-sol` without changing reasoning. Start from [provider-payload](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/provider-payload.ts) and its `before_provider_request` hook; OpenAI controls availability and extra usage. |
| Browser | Use [Lightpanda](../skills/lightpanda/SKILL.md) and existing browser tools before adding an adapter. |
| Web routing | Start with one agreed search provider; reuse [Lightpanda](../skills/lightpanda/SKILL.md) for extraction. |
| Notebook context | Reuse the [notebook reader](../skills/notebook/SKILL.md); add dedicated tools only where needed. |
| PDF context | Reuse [document analysis](../skills/document-analysis/SKILL.md) for page-aware search and metadata. |
| Git checkpoints | Explicit, persistent snapshots and confirmed restore of staged, unstaged, and untracked files. Review [Pi's example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/git-checkpoint.ts); never push snapshot refs. |
| Git commit | Draft from staged changes, edit the message, then confirm the commit. Review the [historical source](https://github.com/Furyfree/ai-workflow/blob/c5db7f3d7403008f094ea4534747d8680bcacc42/extensions/git-commit.ts); pushing needs separate approval. |
