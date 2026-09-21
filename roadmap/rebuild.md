# Rebuild around actual use

Analysis from 2026-09-21. Sources: this repository, agent history in Claude
Code, Codex, Grok, and OpenCode, and the sibling repositories in `~/Projects`.

Recommendation: cut this repository from about 6,100 lines to about 300 and
rebuild it around the loop actually used: analyse, numbered plan, "do it",
"commit and push".

Limits: agent history starts 2026-09-14 (fresh install), so no sessions from
the period when this workflow was installed survive. Its cost is measured
through the documents it scaffolded and how agents behave in those
repositories. `~/.zeron` was not analysed. The pull-request, CodeRabbit, and
hosted-review workflow was in real use before this install and has been
dropped since; it survives as one opt-in skill, not as global policy.

## Findings

### 1. The repository describes an unused workflow

About 800 human messages across the four tools:

| Observation | Count |
| --- | --- |
| Pull requests requested | 0 |
| CodeRabbit runs | 0 |
| Hosted reviews | 0 |
| "Do not edit, give me the plan" messages | about 50 |
| Commit, push, or release on explicit command | about 84 |

The loop is the same in every tool: ask for analysis, get a numbered plan,
answer it point by point, say "do it", test on real hardware, then say "commit
and push to main". 55 of 135 lines in `global/shared.md` and the 256-line
`pr-readiness` skill regulate a pull-request cycle that never happens.

### 2. The real review process is missing

A cheap model drives in OpenCode. Claude, Grok, and GLM run as read-only
validators from the command line, about 200 times in one week. Every validator
prompt repeats the same contract by hand: read-only, findings only,
`file:line`, LGTM when clean, a word cap.

### 3. The slowness comes from scaffolded documents

- Nimbus `AGENTS.md` is 229 lines. Its task-branch rule produced 5 branches or
  worktrees where 1 was requested.
- Homelab has 58 docs-only commits against 54 code-only.
- Nimbus `TASKS.md` is touched by 148 of 307 commits.
- The dotfiles README is 2,563 lines, and `TASKS.md` keeps 78 completed items.
- Evidence sections, completion rules, and "this file owns" preambles all come
  from the templates in `ai-project-manager`.
- The lean repositories work: fedora-iso has a 22-line `AGENTS.md` and a
  README; win-setup has a 24-line `TASKS.md`.

### 4. Questions work in one format

Agents asked 111 questions. In OpenCode, 57 of about 99 answers picked the
option marked Recommended and 3 caused confusion. What works: one question at
a time, 2-3 options, a recommendation, no jargon. What fails: guessing, acting
unasked, and long explanations (about 35 messages ask for a simpler one).

### 5. It targets the wrong agents

The installer supports Codex and Claude Code. Daily use is OpenCode, with Grok
and Claude as validators; Codex has been idle since 2026-09-18.
`~/.agents/skills` is already the shared skill root: OpenCode and Grok read it
natively, Claude through symlinks. Grok also reads `~/.claude/CLAUDE.md`. No
tool has global instructions installed today, so the same instructions get
retyped in every session.

### 6. The repository has the bloat it warns about

3,450 lines of scripts install 7 Markdown files. 1,440 of those lines install
OCR runtimes for a skill with 0 recorded invocations. `TASKS.md` holds 20
unchecked manual checks.

## Plan

Settled: rebuild in place; keep `document-analysis` but simplify it; vendor
foreign skills unchanged; commit steps straight to main on request. Codex needs
no extra work (it reads `~/.agents/skills`). Zeron needs none either (it drives
the OpenCode, Claude Code, and Codex CLIs).

One commit per step:

1. Simplify `document-analysis` to about 40 lines: `liteparse parse` instead of
   `pdftotext`; `liteparse screenshot` plus vision for math, handwriting,
   figures, and messy tables; one four-row route table. Delete the PaddleOCR
   and Chandra routes, the reference file, `install-tools.sh`, the CUDA checks,
   and their tests (about 2,000 lines). README install note:
   `mise use -g npm:@llamaindex/liteparse`.
2. Delete `pr-readiness`, `local-pr-review`, `subagent`, `passthrough`,
   `html-plan`, `ai-project-manager`, `codex/`, `.codex/`, `SPEC.md`,
   `ROADMAP.md`, `TASKS.md`, `roadmap/`, the pull-request template,
   `uninstall.sh`, `test-install.sh`, and every `agents/openai.yaml` (Codex
   display metadata only).
3. Replace `global/shared.md` with the draft below, 40 lines at most.
4. Add own skills under `.agents/skills/`, 60 lines at most each:
   - `validate`: write the diff or plan to a temp file; run `claude -p`,
     `grok`, and `opencode run` in parallel under `timeout 300`; fixed
     contract (read-only, findings only, `file:line`, "over-engineered?",
     LGTM when clean, word cap); dedupe, check each finding against the code,
     return a numbered list with a recommendation; never auto-fix; Fable only
     on request. Confirm CLI flags from each `--help` when writing it.
   - `lean-docs`: minimum document set (README for usage, `AGENTS.md` of 40
     lines at most; SPEC and an open-items TASKS only for nimbus) and the
     never-scaffold list (evidence sections, completed checkboxes, per-release
     logs, ownership preambles, plans for stopped work). Proposes cuts as a
     numbered list before editing.
   - `pr`, about 40 lines, replaces `pr-readiness` and `local-pr-review`. It
     runs only when asked for a pull request, never from a commit or push:
     1. Propose branch name and title in one line; wait for go.
     2. Run the checks the repository's `AGENTS.md` names; stop on failure.
     3. Branch, commit, push, `gh pr create` with a body of five lines at most.
     4. Ask one question, which review: none, `validate` (Recommended),
        CodeRabbit CLI, or hosted Codex (`@codex review`, then hand back). Run
        only the one picked, once.
     5. Findings as a numbered list with a recommendation each; fix what is
        approved; no second review round unless asked.
     6. When CI is green, say so and give the merge command. Merge and branch
        cleanup only on request.
     Whether a repository uses pull requests at all is one line in its own
     `AGENTS.md`. Default: current branch, no pull request.
   - Skills only, no slash commands or harness-specific syntax. Each own
     skill's description lists the phrases actually typed, in English and
     Danish ("make a PR", "lav en PR", "validate this", "valider", "debloat the
     docs", "read this PDF"). Naming a skill ("use the pr skill") always works.
5. Vendor the foreign skills listed below: copy each `SKILL.md` unchanged and
   record source URL, commit, and license in the README table.
6. Rewrite `scripts/install.sh`, about 35 lines: link `shared.md` to the three
   global rule files; link every skill directory into `~/.agents/skills` and
   `~/.claude/skills`; skip and report any target that is a real non-empty
   file or directory; `--uninstall` removes only links into this repository.
7. Rewrite `scripts/validate.sh`, about 20 lines: skill name matches its
   directory, line budgets (40 for `shared.md`, 80 for own skills),
   `shellcheck` when available.
8. README 60 lines at most (what, install, skills table, ponytail plugin
   commands per harness). `AGENTS.md` 20 lines at most.
9. Install, then one fresh session per harness in a scratch repository: rules
   loaded, skills listed, "add a small feature" gets a plan or a question and
   no edit, no branch created.
10. Cut the downstream repositories one at a time with `lean-docs`:

| Order | Repository | Cut |
| --- | --- | --- |
| 1 | nimbus | `AGENTS.md` from 229 to about 40 lines; drop the branch rule; open items only in `TASKS.md` |
| 2 | dotfiles | completed `TASKS.md` items; README essays |
| 3 | homelab | roadmap phases 2-5 |
| 4 | copr | per-version logs in package READMEs |
| 5 | niriland, docs | archive dead planning documents |

Target layout:

```text
.agents/skills/{validate,pr,lean-docs,document-analysis,<vendored>}/
global/shared.md
scripts/{install.sh,validate.sh}
.github/{workflows/validate.yml,dependabot.yml}
AGENTS.md  CLAUDE.md  README.md
```

### Draft `global/shared.md`

```markdown
- Read the repository's AGENTS.md and the code you touch first.
- Default to analysis. Edit only after I say go. "Do not edit" holds until I
  lift it.
- A clear change inside one existing file: just do it once I say go. Anything
  bigger needs a short numbered plan I approve first: more than one file, a
  new file, a new dependency, or a new language. If the work outgrows the
  approved plan, stop and ask.
- Never choose a language or framework for a repository yourself. Ask.
- If a choice changes the result, ask. One question at a time, 2-3 options,
  mark one Recommended, plain words. Do not guess. No questionnaires.
- Never commit, push, branch, open a pull request, tag, release, publish, or
  install unless I ask for that exact action. Work on the current branch.
- No AI slop: no overpolished filler, no bloat. Least code, least docs, and
  fewest words that still make sense.
- Least code that works: reuse the repository, then the standard library and
  platform, then existing dependencies. No new dependency, language,
  abstraction, or configuration for hypothetical needs.
- Prefer how upstream or established projects do it over inventing.
- Fix root causes. After a fix, verify it or tell me exactly what to test.
- Docs: README is usage, AGENTS.md is constraints. Never create a new Markdown
  file without asking. No SPEC, ROADMAP, TASKS, or plan files, evidence
  sections, done lists, or restating code or Git. One owner per fact; link
  instead of repeating.
- Replies: answer first, short, everyday words. Explain a technical term the
  first time you use it. One concrete example beats a paragraph. No preamble
  or recap. If I do not understand, simplify; do not add more.
- A command or subagent that hangs: stop it and tell me.
- Reply in the language I write in. Never print secrets.
```

## Debloat coverage

| Area | Prevent, always on | Clean up, on demand | Status |
| --- | --- | --- | --- |
| Code | ponytail plugin hook; least-code rule; plan gate for anything beyond one file | `ponytail-review` (diff), `ponytail-audit` (repository), "over-engineered?" in the `validate` contract | covered |
| Docs | docs rule with ask-before-new-Markdown; non-goals in each `AGENTS.md` | `lean-docs` (which files exist), `stop-slop` (prose inside them), `caveman-commit` (commits) | `lean-docs` to write |
| Explanations | reply rule (short and everyday words) and slop rule; caveman (candidate, shortens only) | none possible afterwards | research |

## Foreign skills

Researched 2026-09-21. Sizes and licenses come from that research; read each
file before vendoring.

| Decision | Skill | Source | Size | License |
| --- | --- | --- | --- | --- |
| Vendor | `stop-slop` | hardikpandya/stop-slop | 2.6 KB | MIT |
| Vendor | `brainstorm` | maragudk/skills | 849 B | MIT |
| Vendor | `modern-python` (skill only, not the hook plugin) | trailofbits/skills | 10 KB | CC-BY-SA-4.0 |
| Vendor | `caveman-commit` | JuliusBrussee/caveman | 2.4 KB | MIT |
| Keep, research | `ponytail` (hook plugin per harness, already installed in all four) | DietrichGebert/ponytail | plugin | - |
| Add, research | `caveman` | JuliusBrussee/caveman | 7 KB | MIT |
| Keep as installed | `find-skills`, `use-modern-go` | skills CLI | - | - |
| When needed | `csharp-refactoring` | dotnet/skills | 11 KB | MIT |
| When needed | `cobra-viper` (only if nimbus uses Cobra) | spf13/go-skills | 17.8 KB | MIT |
| Reference only | `rpm-packaging` (no license, generic RHEL) | redhat-community-ai-tools/claude-plugins | 3.6 KB | none |

Rejected: most of obra/superpowers (17-32 KB each), addyosmani
`remove-ai-slops` (21 KB), the 20 KB shell and GitHub Actions skills, and
anthropics/skills (office and design only). Nothing found beats ponytail for
code. Own-skill candidates, only when friction repeats: Fedora/COPR packaging,
lean shell, release notes, chezmoi, modern C.

### Import

| Harness | Skills from | Global rules from |
| --- | --- | --- |
| OpenCode | `~/.agents/skills`, `~/.claude/skills` | `~/.config/opencode/AGENTS.md` |
| Codex | `~/.agents/skills` (not `~/.codex/skills`) | `~/.codex/AGENTS.md` |
| Grok | `~/.agents/skills`, `~/.grok/skills` | `~/.claude/CLAUDE.md` through compat |
| Claude Code | `~/.claude/skills` only | `~/.claude/CLAUDE.md` |

Plain `SKILL.md` skills need two symlinks to reach all four. Hook plugins
(ponytail) install once per harness. Vendoring is preferred over
`npx skills add` because that CLI has no lock file or commit pinning.

## Research before building

Ponytail and caveman are both in the plan for now. Open question: are both
needed, or do rules borrowed into `shared.md` do the same job?

- Run three fixed tasks in OpenCode with the daily cheap model: one small
  feature, one README section, one "explain this error". Compare rules only,
  rules plus ponytail, and rules plus ponytail plus caveman. Record diff lines,
  doc lines, reply words, and whether the explanation was understood the first
  time.
- Measure the always-on context each one adds per session.
- Caveman risk: clipped sentences against about 35 recorded "simplify"
  requests. Length and clarity are separate problems.
- Release notes that say nothing are emptiness, not bloat. Decide whether
  that needs its own rule.
