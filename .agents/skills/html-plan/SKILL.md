---
name: html-plan
description: Create a self-contained visual HTML explanation from a broad plan, architecture, dependency map, comparison, roadmap, or status report. Use when relationships are materially clearer as a diagram, table, timeline, hierarchy, or visual plan; do not use for a single fact, a short list, or prose that is already easy to scan.
---

# HTML plan

Create a derived visual view while keeping Markdown as the source of truth.

## Decide whether HTML helps

Use a visual when the material contains at least one of:

- three or more dependent steps
- one component affecting several downstream components
- a non-trivial hierarchy or architecture
- repeated-field comparisons
- state changing across a sequence
- a plan too broad to scan reliably as prose

Otherwise answer in prose or a short list.

## Gather the source

1. Read the canonical specification, roadmap, tasks, and relevant references.
2. Identify the audience and the decision the page should support.
3. Separate accepted facts from proposals, risks, and unresolved decisions.
4. Choose the smallest useful visual form.

## Build

- Start from `assets/base.html` when useful.
- Produce one HTML file with inline CSS and JavaScript.
- Do not require network fonts, scripts, images, or stylesheets.
- Use semantic landmarks, one clear `h1`, logical heading order, and meaningful
  link text.
- Support keyboard use, readable contrast, reduced motion, narrow viewports,
  and printing.
- Use real tables for comparisons and SVG or CSS for simple diagrams.
- Avoid decorative dashboards, animations, or cards that do not convey
  information.
- Link to the canonical Markdown sources.

Do not copy the full source documents into the page. Summarize relationships
and keep detailed reference material collapsible or linked.

## Validate

Run:

```sh
python3 scripts/validate_html.py path/to/plan.html
```

Resolve the script relative to this skill directory. Then:

1. Open the page in a browser.
2. Inspect desktop and narrow viewport layouts.
3. Check for clipping, overflow, unreadable text, broken links, and missing
   content.
4. Check print preview when the page is intended for sharing.

If browser tooling is unavailable, report that visual inspection did not run.

## Deliver

Return the file path, source documents used, validation performed, and any
rendering checks that could not run. State explicitly that the HTML is derived
and does not replace the Markdown plan.
