---
name: research
description: >
  Find facts on the web and get past refused or unreadable pages. Use for
  "look it up", "research this", "find it online", "the site blocked you",
  "you got a 403", "søg på nettet", "undersøg det", "find det online",
  "siden blokerede dig". Not for local files, PDFs (use document-analysis),
  or clicking through a site (use lightpanda).
---

# Research

A website refusing you is not a sandbox block. Try the next route before you
stop.

Name the failure first:

- Your network refused it: the request never left the session, such as a
  cloud sandbox's network setting or a proxy error. Routes through the same
  network fail too; say so.
- The site refused it: HTTP 401, 403 or 429, a challenge page, or "access
  denied".
- Empty page: the page needs JavaScript.
- Summary only: the fetch tool returned a model's summary, so a missing detail
  may still be on the page.

Search with Pi's `web_search` (provider `codex` or `claude`), otherwise the
harness's own search. Then take the first route that answers:

1. GitHub: read the file or API through `gh` or raw.githubusercontent.com, not
   the rendered page.
2. Full page: Pi's `web_read`, otherwise
   `lightpanda fetch --block-private-networks --dump markdown <url>`. See
   [lightpanda](../lightpanda/SKILL.md).
3. Archive copy: `https://web.archive.org/web/<url>` opens the latest snapshot.
4. Another source: official docs, a changelog, the vendor's repository, or a
   second reputable site.
5. Ask me to save the page as a PDF, then read it with
   [document-analysis](../document-analysis/SKILL.md).

Rules:

- Give a link for every claim. Name the archive or second source when the
  original page was not read.
- Never fake a browser user agent, use unblocker proxies, or solve CAPTCHAs.
  Go elsewhere instead.
- Send only public search terms, not private code or conversation text.
- Say what you could not reach.
