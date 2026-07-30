# AI workflow tasks

## Current phase: Controlled discovery

- [ ] Confirm Codex and Claude Code load the linked global instructions.
- [ ] Confirm both agents discover and invoke all six skills.
- [ ] Confirm the installed global Codex policy handles required read-only
      branch and pull-request inspection.
- [ ] After proving the global policy, remove
      `.codex/rules/repository-pr.rules` and its documentation and validation
      references.
- [ ] Handle discovery differences through paths or repository routing without
      duplicating shared instructions.
- [ ] Record recovery steps and any behavior that could not be verified.

## Completion rule

Mark tasks complete only after their evidence exists. Controlled agent
discovery is the current phase. Publication and Homelab adoption remain
separate work.
