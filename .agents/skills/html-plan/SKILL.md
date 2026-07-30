---
name: html-plan
description: Create a self-contained visual HTML page. Use when the current request asks for HTML or a visual explanation, or when a broad architecture, dependency map, comparison, roadmap, or status report is materially clearer visually than in prose.
---

# HTML plan

Treat HTML as a derived visual explanation, not a source of truth.

## Build

1. Read the canonical sources.
2. Identify the audience, decision, accepted facts, risks, and open questions.
3. Choose the smallest useful visual structure, such as a timeline, flow,
   hierarchy, diagram, or repeated-field comparison.
4. Choose the design and layout for the subject and audience. Do not impose a
   fixed template or house style.
5. Produce one file with inline CSS and JavaScript and no required network
   resources.
6. Use semantic headings, readable contrast, keyboard-safe interactions,
   responsive layout, and print styles.
7. Link back to the canonical sources.

Do not copy the full source documents or make HTML a second specification.

## Check and deliver

Open the result in a browser and inspect desktop and narrow layouts for
clipping, overflow, unreadable text, broken links, and missing content. If
browser tooling is unavailable, say so.

Return the file path, sources used, checks performed, and limitations. State
that the HTML is derived and Markdown remains canonical.
