# Rebuild around actual use

Analysis from 2026-09-21. Sources: this repository, agent history in Claude
Code, Codex, Grok, and OpenCode, and the sibling repositories in `~/Projects`.

Recommendation: cut this repository from about 6,100 lines to about 300 and
rebuild it around the loop actually used: analyse, numbered plan, "do it",
"commit and push".

Limits: agent history starts 2026-09-14 (fresh install), so no sessions from
the period when this workflow was installed survive. Its cost is measured
through the documents it scaffolded and how agents behave in those
repositories. `~/.zeron` was not analysed.

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

1. Replace `global/shared.md` with the draft below.
2. Delete `pr-readiness`, `local-pr-review`, `subagent`, `passthrough`,
   `html-plan`, `ai-project-manager`, the Codex rules files, `SPEC.md`,
   `ROADMAP.md`, `TASKS.md`, `roadmap/`, and the pull-request template.
3. Add two skills, at most 60 lines each:
   - `validate`: the cross-model read-only review contract, the three CLI
     invocations, and a timeout.
   - `lean-docs`: the minimum document set and a never-scaffold list (evidence
     sections, completed checkboxes, per-release logs, ownership preambles,
     plans for stopped work).
4. List foreign skills (ponytail, find-skills, use-modern-go) in a `skills.txt`
   manifest installed through the skills CLI. Do not vendor them.
5. Shrink the installer to about 30 lines of symlinks: `shared.md` to
   `~/.claude/CLAUDE.md`, `~/.config/opencode/AGENTS.md`, and
   `~/.codex/AGENTS.md`; `skills/*` into `~/.agents/skills` plus the Claude
   links. Reduce `validate.sh` to a line-budget check: 40 lines for
   `shared.md`, 80 per skill.
6. Cut the downstream repositories one at a time with `lean-docs`:

| Order | Repository | Cut |
| --- | --- | --- |
| 1 | nimbus | `AGENTS.md` from 229 to about 40 lines; drop the branch rule |
| 2 | dotfiles | completed `TASKS.md` items; README essays |
| 3 | homelab | roadmap phases 2-5 |
| 4 | copr | per-version logs in package READMEs |
| 5 | niriland, docs | archive dead planning documents |

### Draft `global/shared.md`

```markdown
- Read the repository's AGENTS.md and the code you touch first.
- Default to analysis. Edit only after I say go. "Do not edit" holds until I
  lift it.
- Non-trivial task: a short numbered plan I can answer point by point.
  Trivial: just do it.
- If a choice changes the result, ask. One question at a time, 2-3 options,
  mark one Recommended, plain words. Do not guess. No questionnaires.
- Never commit, push, branch, open a pull request, tag, release, publish, or
  install unless I ask for that exact action. Work on the current branch.
- Least code that works: reuse the repository, then the standard library and
  platform, then existing dependencies. No new dependency, language,
  abstraction, or configuration for hypothetical needs. If the diff outgrows
  the request, stop and say so.
- Prefer how upstream or established projects do it over inventing.
- Fix root causes. After a fix, verify it or tell me exactly what to test.
- Docs: README is usage, AGENTS.md is constraints. No SPEC, ROADMAP, TASKS, or
  plan files, evidence sections, done lists, or restating code or Git. One
  owner per fact; link instead of repeating.
- Replies: answer first, short, plain. No preamble or recap. If I do not
  understand, simplify; do not add more.
- A command or subagent that hangs: stop it and tell me.
- Reply in the language I write in. Never print secrets.
```

## Open decisions

1. Gut in place or start a fresh repository? Recommended: in place.
2. `document-analysis` and its OCR installer (about 2,050 lines): delete or
   move to its own repository? Recommended: move.
3. Installer: small `install.sh` or chezmoi-managed symlinks? Recommended:
   `install.sh`.
4. Keep Codex support? Recommended: yes, it costs one symlink.
5. Support Zeron? Needs a look at where it loads instructions.
