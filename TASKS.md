# AI workflow tasks

## Current phase: Controlled discovery

- [x] Add the unified document-analysis skill with vision-first reconstruction,
      optional non-blocking local OCR sidecars, engine-selection research, and
      UI metadata.
- [x] Extend isolated install, uninstall, and inventory validation to all seven
      skills.
- [x] Add and isolate-test the idempotent LiteParse, PaddleOCR, and Chandra
      runtime installer.
- [x] Preflight runtime tools, versions, and paths as one plan; install missing
      uv tools concurrently; reject missing PaddlePaddle engines; repair extras
      without replacing custom accelerator engines; report advisory Chandra
      CUDA and VRAM status only when an NVIDIA GPU is visible; and add
      manifest-scoped skill pruning.
- [x] Prepare PaddleOCR-VL for a Linux RTX 3080 pilot with explicit NVIDIA
      selection, driver-based CUDA 12.6 or 11.8 wheels, isolated CPU-to-GPU
      reconfiguration, dependency-confusion-safe package-source separation,
      rollback on failed replacement, post-upgrade engine reinjection, CUDA
      verification, and no implicit model download.
- [x] Tighten shared change guidance around existing capabilities, YAGNI,
      required safeguards, and root-cause fixes.
- [ ] Confirm Codex and Claude Code load the linked global instructions.
- [ ] Confirm both agents discover and invoke all seven skills, including the
      unified document routing without implicit runtime installation.
- [ ] After separately installing the selected document runtimes, verify
      born-digital, printed, handwritten, formula-heavy, table-heavy, Markdown,
      LaTeX, and Typst paths in fresh sessions.
- [ ] In fresh sessions, confirm ordinary edits do not activate planning,
      passthrough, or pull-request workflows.
- [ ] In fresh sessions, confirm agents prefer existing capabilities, avoid
      hypothetical future work, preserve required safeguards in small diffs,
      and trace bug callers to shared causes.
- [ ] Confirm a request to create a pull request or commit further work to an
      existing pull request activates `pr-readiness`.
- [ ] Confirm a local-review request activates `local-pr-review`, while a
      current hosted Codex review does not cause a redundant local review.
- [ ] Confirm a draft pull request uses exactly one `@codex review` comment,
      approved fix commits do not trigger another manual review, and final-head
      CI gates the ready-for-review decision.
- [ ] Confirm unavailable hosted Codex review is reported without substituting
      CodeRabbit or another provider.
- [ ] Confirm CodeRabbit runs only through its authenticated local CLI and no
      GitHub comment, App, review request, check, or bot mention is used.
- [ ] Confirm a pull-request cycle stops after one hosted Codex review, at most
      two local CodeRabbit CLI runs, and one full local fallback, then uses
      targeted verification for approved local findings.
- [ ] Confirm the final readiness handoff appears when only explicit human
      actions remain and gives the resolved remote and branch commands in
      switch, fast-forward pull, safe local delete, and prune order.
- [ ] Confirm an explicit pull-request creation request includes the one hosted
      Codex review while commits, pushes, and existing pull-request updates
      leave any additional review trigger to the user.
- [ ] Confirm an accepted hosted Codex review trigger returns control
      immediately and review inspection starts only after a later user prompt.
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
