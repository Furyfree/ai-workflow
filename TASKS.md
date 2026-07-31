# AI workflow tasks

## Current phase: Controlled discovery

- [ ] Confirm Codex and Claude Code load the linked global instructions.
- [ ] Confirm both agents discover and invoke all six skills.
- [ ] In fresh sessions, confirm ordinary edits do not activate planning,
      passthrough, or pull-request workflows.
- [ ] Confirm a request to create a pull request or commit further work to an
      existing pull request activates `pr-readiness`.
- [ ] Confirm a local-review request activates `local-pr-review`, while a
      current hosted review does not cause a redundant local review.
- [ ] Confirm a draft pull request uses one deliberate hosted review, approved
      fix commits do not trigger another manual review, and final-head CI gates
      the ready-for-review decision.
- [ ] Confirm a pull-request cycle stops after one hosted review, at most two
      CodeRabbit runs, and one full local fallback, then uses targeted
      verification for approved local findings.
- [ ] Confirm the final readiness handoff gives resolved post-merge commands in
      switch, fast-forward pull, safe local delete, and prune order without
      running them before merge.
- [ ] Confirm an explicit pull-request creation request includes the one hosted
      review while commits, pushes, and existing pull-request updates leave any
      additional review trigger to the user.
- [ ] Confirm an accepted hosted-review trigger returns control immediately and
      review inspection starts only after a later user prompt.
- [ ] Confirm passthrough, visual-plan, delegation, and repository-foundation
      requests activate only their matching workflows.
- [ ] Run `ai-project-manager` against one representative new or existing
      repository and confirm that it assesses optional Codex Cloud setup without
      changing connector access, environments, review settings, or secrets.
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
