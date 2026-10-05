# Pi as the main coding harness

Research dated 2026-10-05, checked against installed Pi 1.0.2 and the local
`ai-workflow`, `dotfiles`, and `docs` repositories. The earlier comparison
also covered Nimbus, COPR, and Fedora ISO. Recheck upstream features and local
source before implementing a proposal. Live Pi extension and MCP activation
have not been audited.

Pi and the shared setup cover ordinary coding, personal instructions,
document reading, and external reviewers. The main gaps for this setup are
approval enforcement and internet search. Most proposals need integration
or a demonstrated reason to add a wrapper.

Implementation belongs in [ai-workflow](https://github.com/Furyfree/ai-workflow)
and [dotfiles](https://github.com/Furyfree/dotfiles). The
[Pi tooling notes](../docs/ideas/ai-workflow/pi/README.md) retain the individual proposals.

## Pi's existing capabilities

| Capability | Available in Pi 1.0.2 |
| --- | --- |
| Coding tools | Read files and images, run shell commands, edit and write files; optional search and directory tools. |
| Models | Multiple providers, model switching, and thinking-level controls. |
| Instructions and skills | Repository instructions and the standard skill format used by ai-workflow. |
| Sessions | Resume, conversation branches, forks, clones, and automatic context summarization. |
| Interaction | Image input, an external editor, interruption, steering messages, and queued follow-ups. |
| External tools | Built-in MCP support for connecting browser, search, and other tool servers. |
| Tool orchestration | Optional `codemode` for combining tool calls and reducing output before the model sees it. |
| Customization | Extension tools, commands, confirmation UI, event hooks, and session state. |
| Automation | Noninteractive operation, JSON output, RPC, and an SDK. |

Sources: [usage](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/usage.md),
[CLI](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/cli.md),
[extensions](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/extensions.md),
and [SDK](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/sdk.md).

MCP is the protocol for connecting external tool servers. Pi supports local
stdio and remote Streamable HTTP servers, authentication, tool discovery,
and resources. Its `tool_search` searches available tools, not the internet.
See [Pi's MCP documentation](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/mcp.md).

## What the shared setup supplies

| Existing source | Contribution to Pi |
| --- | --- |
| [Rules and installer](https://github.com/Furyfree/ai-workflow/blob/main/install.sh) | Links shared rules as Pi's global AGENTS.md and skills under ~/.agents/skills. |
| Coding skills | Testing, Go, Python, documentation, brainstorming, and writing procedures. |
| [Notebook skill](https://github.com/Furyfree/ai-workflow/blob/main/skills/notebook/SKILL.md) | Cell selection, limited outputs, LaTeX, and exported images through nb.py. |
| [Document analysis](https://github.com/Furyfree/ai-workflow/blob/main/skills/document-analysis/SKILL.md) | LiteParse extraction, OCR, selected pages, and page images for vision. LiteParse is installed. |
| [Lightpanda skill](https://github.com/Furyfree/ai-workflow/blob/main/skills/lightpanda/SKILL.md) | Page extraction and scripted interaction. The binary is installed. |
| [Subagent launcher](https://github.com/Furyfree/ai-workflow/blob/main/skills/subagent/SKILL.md) | Calls to Claude, Codex, Grok, OpenCode, and Pi, with bounded runtime and provider routing. |
| [Validation skill](https://github.com/Furyfree/ai-workflow/blob/main/skills/validate/SKILL.md) | Parallel independent reviews, failure handling, and checking findings before applying them. |
| [PR skill](https://github.com/Furyfree/ai-workflow/blob/main/skills/pr/SKILL.md) | Requested PR creation and reading reviews/CI, with approval steps. |
| [Dotfiles](https://github.com/Furyfree/dotfiles) | Pi provisioning, fullscreen UI, copy-on-select, quiet startup, and project trust set to ask. The pi-acp editor adapter is installed. |

Rules and skills guide the model. They do not enforce permissions. The Pi
settings template asks whether a project may load its resources; it does
not require approval for each command or edit. External skills and plugins,
including Ponytail and find-skills, remain outside ai-workflow's installer.

## Upstream extensions to adopt

Separate built-in features, upstream extensions, and custom implementation.
Pi supplies working extensions that can form part of the daily setup after
review and integration.

| Extension | Contribution to the setup |
| --- | --- |
| [subagent/](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/subagent/README.md) | Isolated agent contexts, single tasks, parallel tasks, sequential workflows, progress, usage tracking, and cancellation. |
| [preset.ts](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/preset.ts) | Switch model, thinking level, tools, and instructions together for analysis or implementation. |
| [plan-mode/](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/plan-mode/README.md) | Exploration mode with plan and progress tracking. Review its tool restrictions; isolation remains a separate concern. |
| [question.ts](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/question.ts) | One-question-at-a-time decisions with labelled choices, descriptions, custom answers, and cancellation. |
| [handoff.ts](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/handoff.ts) | Review and edit a context summary before starting a focused session. |
| [notify.ts](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/notify.ts) | Notify through supported terminals when Pi finishes and needs input. |
| [bookmark.ts](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/bookmark.ts) | Label decisions and useful findings for conversation-tree navigation. |
| [github-issue-autocomplete.ts](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/github-issue-autocomplete.ts) | Complete issue references through #123 input using gh. |

The [example catalogue](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/README.md)
lists these implementations. They require loading; this research does not
establish that the live setup has enabled them.

### Subagent integration

The upstream example implements the Pi-to-Pi engine and UI. It supports up
to eight parallel tasks with four running at once, or a chain that passes
each result to the next agent. Each child has its own conversation and can
work on the same files, so editing tasks need separate file ownership.
Plain-language delegation works without installing the workflow prompts.

Keep the shared launcher for requests to use the actual Claude Code,
Codex, Grok, and OpenCode CLIs. Combining those routes into the Pi subagent
UI can wait.

Adoption needs these adjustments:

- Choose verified models for the supplied roles. The sample definitions
  pin older Claude models; omitting a model inherits the parent's model
  and thinking level.
- Define read-only roles and review child tool loading. Scout and reviewer
  include Bash, and a separate process does not inherit the parent's
  in-memory permission state.
- Add the shared launcher's ten-minute runtime bound. The example handles
  cancellation but has no fixed task deadline.
- Preserve approval stops before implementation and before applying review
  fixes. The sample workflow prompts can proceed across those steps.
- Support the extension directory containing index.ts and agents.ts, plus
  agent definitions. The current installer links only individual
  extensions/pi/*.ts files.

Check the [implementation](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/subagent/index.ts),
[agent definitions](https://github.com/earendil-works/pi/tree/v1.0.2/packages/coding-agent/examples/extensions/subagent/agents),
and [workflow prompts](https://github.com/earendil-works/pi/tree/v1.0.2/packages/coding-agent/examples/extensions/subagent/prompts)
when integrating those changes.

## The eight extension proposals

Pi ships extension examples alongside the runtime. They require loading and
review; they are not enabled built-in workflows. Start from the
[official examples](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/README.md)
when an extension becomes necessary.

| Proposal | Reuse first | Custom work if needed |
| --- | --- | --- |
| [Carryover](../docs/ideas/ai-workflow/pi/extensions/carryover.md) | Native continuation, then Pi's handoff example, which lets the user edit a summary before creating a focused session. | The proposed export options and summary format. |
| [Questions](../docs/ideas/ai-workflow/pi/extensions/ask-user-question.md) | Pi's question example: choices, descriptions, custom answers, and cancellation. | Free-text-only questions, optional custom answers, and the proposed noninteractive contract. |
| [Browser](../docs/ideas/ai-workflow/pi/extensions/pi-browser.md) | Existing browser tools through native MCP. Lightpanda exposes navigation, reading, clicks, and forms. | A Pi adapter only if an existing interface fails a real workflow. |
| [Web routing](../docs/ideas/ai-workflow/pi/extensions/web-router.md) | One existing search service or MCP server; Lightpanda for extraction. | Multiple-provider routing, budgets, and caching after a demonstrated need. |
| [Notebook context](../docs/ideas/ai-workflow/pi/extensions/notebook-context.md) | The shared nb.py reader. | Semantic notebook diffs or a dedicated editing tool. A reading wrapper adds little today. |
| [PDF context](../docs/ideas/ai-workflow/pi/extensions/pdf-context.md) | The shared document-analysis skill. | Convenient page-aware search and metadata tools if repeated extraction becomes a problem. |
| [Git checkpoints](../docs/ideas/ai-workflow/pi/extensions/git-checkpoint.md) | Manual Git snapshots. | Persistent, explicit snapshot/restore handling staged, unstaged, and untracked files. |
| [Git commit](../docs/ideas/ai-workflow/pi/extensions/git-commit.md) | Ordinary Git and the commit-message skill. | The dedicated message editor and confirmation workflow. |

The [handoff example](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/handoff.ts)
already uses the active branch and lets the user review the generated prompt.
The [question example](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/question.ts)
requires choices and offers a custom-answer option. Those examples cover much
of the proposals without starting from scratch.

Lightpanda offers an [existing MCP server](https://lightpanda.io/docs/quickstarts/mcp).
Its screenshot tool produces approximate text layout rather than accurate
CSS, fonts, and images; see the [tool reference](https://lightpanda.io/docs/reference/mcp-tools).
[Playwright MCP](https://github.com/microsoft/playwright-mcp) supplies a
full-browser route for visual checks. Selecting or provisioning that route
remains a separate decision.

Pi's [Git checkpoint example](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/examples/extensions/git-checkpoint.ts)
uses transient stash references and offers restoration during a fork. It
does not implement the proposed persistent manual checkpoint workflow.
Conversation branching alone does not restore working-tree files.

## Git extension discrepancy

The current ai-workflow checkout has no `extensions/` directory or tracked
Pi extension files. The installer supports linking `extensions/pi/*.ts`
but has no files to link.

The ai-workflow README describes a revised staged-only commit extension
that never pushes. The Pi tooling notes describe an older extension that
auto-stages, commits, pushes, and attempts a soft rollback after push failure.
Neither description establishes an extension supplied by the current tree.

The [older source remains in Git history](https://github.com/Furyfree/ai-workflow/blob/c5db7f3d7403008f094ea4534747d8680bcacc42/extensions/git-commit.ts).
Any restoration needs review of staging, commit confirmation, separate push
authorization, and failure recovery against the current Pi runtime.

## Gaps that affect the main-harness choice

**Approval enforcement and isolation.** Pi has no built-in per-tool approval
system or operating-system sandbox. Its permission and plan-mode examples
are starting points, not enforcement of the complete analyse-until-go
policy. Shell commands can write files without using edit or write tools.
Reuse an existing isolation system for hard limits. A permission extension
can supply the approval experience, but cannot replace that boundary.
Project trust controls resource loading. See
[Pi's security documentation](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/security.md)
and [isolation options](https://github.com/earendil-works/pi/blob/v1.0.2/packages/coding-agent/docs/containerization.md).

**Internet search.** The Lightpanda wrapper forbids its search service and
otherwise assumes the harness has search. Pi leaves that route missing.
Connecting an existing search tool is sufficient for an initial setup;
a multi-provider router has no demonstrated need yet.

**Integrated subagents.** Adopt the upstream Pi-to-Pi implementation with
the [integration adjustments above](#subagent-integration). The shared skill
can use the resulting subagent tool for generic delegation. Keep the
cross-CLI launcher for explicit native CLI requests; combining both
interfaces is optional. Tool selection does not provide a filesystem
sandbox.

**Notebook editing.** The shared notebook skill expects a harness notebook
edit tool and asks before editing JSON without one. Pi supplies no dedicated
notebook editor. Reading works; editing needs an agreed workflow or tool if
it becomes a regular task.

**Desktop integration.** Dotfiles declares pi-acp, but its managed Zed agent
list has no Pi entry. Noctalia's configured agent list also omits Pi. Those
are configuration gaps. The per-terminal status badges in the
[Spaces proposal](../docs/ideas/noctalia-plugins/spaces.md) remain a separate desktop
project. Its dated herdr installation observations need rechecking before
adding another status integration.

**Unattended PR monitoring.** The existing PR skill covers requested checks.
The restart-safe observer in [babysit-pr](../docs/ideas/ai-workflow/babysit-pr.md) requires new
implementation regardless of the main harness.

## Recommended priorities

- Foundation: approval enforcement, an internet-search route, and
  Lightpanda MCP integration.
- Daily workflows: upstream subagents and presets, alongside questions
  and handoff. Reuse the shared skills, native sessions, and cross-CLI
  launcher.
- Conveniences: plan-mode, terminal notifications, bookmarks, and GitHub
  issue completion. Compare presets with plan-mode before enabling
  overlapping planning interfaces.

Most work here is adapting roles, permissions, and installation around
upstream implementations. Custom PDF/notebook wrappers and a combined
cross-CLI subagent UI remain deferred.

Defer PDF and notebook reading wrappers, provider routing, caching, and
automatic Git snapshots until a repeated workflow needs them. Nimbus, COPR,
dotfiles, and Fedora ISO do not require dedicated Pi extensions for their
ordinary coding work. Preserve native CLI routes for capabilities and
account access that changing the main harness does not replace.
