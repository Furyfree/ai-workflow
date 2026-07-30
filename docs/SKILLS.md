# Skills

Canonical skills live under `.agents/skills/`. The installer copies or links
the same skill directories into each selected agent's supported user path.

## Installed skills

- `ai-project-manager`
- `html-plan`
- `pr-readiness`

## `ai-project-manager`

Creates or reconciles repository planning documents, identifies conflicts, and
selects one bounded phase. Its project templates are stored under
`assets/project/`.

Use it for new repository foundations, plan reviews, or document
reconciliation. It must stop before implementation when the request is
planning-only.

## `pr-readiness`

Checks the complete local change, deterministic validation, manual evidence,
optional local CodeRabbit, pull-request CI, and review state.

It reports readiness but does not commit, push, create a pull request, merge,
deploy, or apply infrastructure without separate authorization.

## `html-plan`

Creates a self-contained visual HTML explanation when architecture,
dependencies, comparisons, or a broad plan benefit from a visual.

Markdown remains canonical. The bundled validator rejects required external
resources and checks the minimum semantic and responsive document structure.

## Skill validation

`scripts/validate_skills.py` checks:

- required frontmatter and canonical names
- concise skill size
- UI metadata
- unresolved placeholders
- one realistic trigger, non-trigger, and behavior inventory per skill

The case inventories under `tests/skill-cases/` define forward-test scenarios.
They make expected behavior reviewable but do not replace real agent testing.
