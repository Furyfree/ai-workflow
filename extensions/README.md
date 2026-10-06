# Pi extensions

Install with the [repository instructions](../README.md), then restart Pi or
run `/reload`. To try an extension without installing:

```sh
pi -e ./extensions/footer.ts
```

Change the filename or repeat `-e` to load more extensions. Do not load both
installed and explicit copies. Use Pi's interactive terminal for the UI features.
Include [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES), with source and licence credits,
when copying or distributing `fast.ts` or `question.ts`; the installer does not link it.

## Fast mode

`/fast` toggles and saves the choice across projects and restarts. Use
`/fast on`, `off`, or `status` to set or inspect it. Default: off.
It requests priority processing for `openai-codex` models without changing reasoning.

OpenAI may reject or downgrade priority and charge extra usage; Pi's cost estimate
may miss it. Use only one service-tier extension.

## Compact footer

For `openai-codex` models:

```text
ai-workflow (main) · context 20.5%/272k · ⏱ 1m23s       gpt-6.1-sol · high · fast
```

The clock includes tools, retries, in-run summarisation, and answer waits.
It freezes when Pi finishes or stops, resets for the next prompt, and clears on
session changes or reload. Background jobs keep their own timers.
`fast` appears when enabled; context keeps warning colours and capacity.
Narrow terminals use two rows. Token totals and cost remain in `/session`.
Other providers keep Pi's default footer. Use only one custom footer extension.

## Image previews

Paste with Pi's clipboard shortcut (normally Ctrl+V). Pi shows `[image #1]`
labels but receives original paths. Move the input cursor inside a label or just
after it to show that image's thumbnail above the prompt. Elsewhere, no preview
appears; mouse hover does not select images. Undo and restored drafts keep attachments.

PNG, JPEG, GIF, and WebP work. Pi's image settings apply; unsupported terminals
and unreadable, invalid, or oversized images fall back to filenames.
Files stay unchanged. The extension will not replace another custom editor.

## Question

The agent calls `question`; you choose from 2–4 options or type an answer.
For a chain, choose **Back** or press Shift+Tab to revisit earlier questions.
Use your selection keys (default ↑/↓, Enter, Esc). Esc leaves the answer editor;
Esc in choices cancels the whole call without submitting partial answers.

Use selection paging keys for long choices. In fullscreen mode, use
Shift+PageUp/PageDown. Pi restores your chat draft when the dialog closes.

## Notify

`/notify` toggles alerts for this runtime; `/notify on`, `off`, and `test` also work.
Default: on. Alerts cover settled tasks and Question, Commit, or subagent editing
approval. Child agents stay silent; alerts contain repository and status, not chat text.

Supports Ghostty, WezTerm, Kitty, and iTerm2. Focus reports suppress alerts while
you watch; alerts can appear before the first focus report. `/notify test` bypasses
focus and the toggle. Check delivery and click-to-return in your terminal.

## Git commit

Use `/commit [message guidance]` or ask to commit in plain words.
Staged hunks define the scope. With nothing staged, choose Everything, Pick files,
or Stop. In the picker, Space selects files and Enter continues.

Review the diff and the current model's message; edit or regenerate it as needed.
The final confirmation offers Commit, Commit and push, or Cancel (the default).
Cancellation before approval preserves staging and working files.
Use Shift+PageUp/PageDown for long previews.

Pushing also requires destination approval and a preview of older unpushed commits.
Repository changes invalidate approval. Hooks and signing stay enabled; failures
keep staging and local commits without retries or rollback. After an interrupted
commit or push, inspect local and remote history before retrying.
Possible secrets and sensitive filenames show file/line warnings with masked excerpts.
The model and diff viewer omit flagged file contents. To proceed, choose **Commit
despite warnings** or **Commit and push despite warnings**; Cancel stays the default.
Approval applies only to the unchanged preview, with no saved exemptions.
Review for sensitive content: the guard catches known patterns, not all secrets.
Detached HEAD and active merge/rebase/cherry-pick operations need manual handling.

## Subagents

Ask in plain words: "use two subagents to search" or "ask Grok in the background".
Foreground waits; background needs your request and delivers results when Pi is
idle and outside dialogs. Up to four jobs can run. CLI costs are separate from Pi's usage.

`/subagents` opens jobs and results. Enter opens a result, `t` switches task/output,
and `s` asks to stop a running job. Esc closes the view; closing does not stop jobs.
Use ←/→ for pages and Shift+PageUp/PageDown for long views. Direct controls:
`/subagents inspect|wait|stop <id>`.

Editing requires confirmation of the task and paths. Only one editor runs; Pi
blocks other parent tools except reads, questions, and subagent controls.
Scope instructions are not a filesystem sandbox. Check partial edits after stopping.
Foreground cancellation stops children. Session changes, tree navigation, reload,
and shutdown stop owned processes; failed cleanup keeps editing blocked.
Saved jobs do not resume, and runs support stopping, not steering or continuation.

Requires POSIX process groups, Bash, and `ps`; unrelated agent sessions do not share
the editing guard. Keep the repository layout: it needs [the launcher](../skills/subagent/run.sh).

## Ideas

| Idea | Purpose | Starting point |
| --- | --- | --- |
| Message queue | View, edit, remove, and reorder queued prompts. Pi already has steering and follow-up queues. | [Pi's queue controls](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/docs/usage.md#change-direction) |
| Bookmark | Label points in the conversation tree. | [Pi example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/bookmark.ts) |
| Handoff | Review a summary before starting a fresh session. | [Pi example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/handoff.ts) |
| GitHub issues | Complete issue references in prompts. | [Pi example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/github-issue-autocomplete.ts) |
| Permission gate | Confirm dangerous commands; not a filesystem sandbox. | [Pi example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/permission-gate.ts) |
| Presets | Switch model, tools, reasoning, and instructions together. | [Pi example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/preset.ts) |
| Plan mode | Read-only exploration and progress tracking. | [Pi example](https://github.com/earendil-works/pi/tree/v1.0.3/packages/coding-agent/examples/extensions/plan-mode) |
| Browser | Reuse existing browser tools before adding an adapter. | [Lightpanda skill](../skills/lightpanda/SKILL.md) |
| Web routing | Choose a search provider and reuse browser extraction. | [Lightpanda skill](../skills/lightpanda/SKILL.md) |
| Notebook context | Bring notebook content into prompts. | [Notebook reader](../skills/notebook/SKILL.md) |
| PDF context | Add page-aware document context. | [Document analysis](../skills/document-analysis/SKILL.md) |
| Git checkpoints | Confirm snapshots and restoration of staged, unstaged, and untracked files; never push snapshot refs. | [Pi example](https://github.com/earendil-works/pi/blob/v1.0.3/packages/coding-agent/examples/extensions/git-checkpoint.ts) |
