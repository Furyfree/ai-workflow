---
name: lightpanda
description: >
  Browse pages that need JavaScript, clicks, or forms with the Lightpanda
  headless browser. Use for "open this page in a browser", "the page needs
  JavaScript", "click through the site", "fill in the form", "scrape this
  site", "use lightpanda", "åbn siden i en browser", "siden kræver
  JavaScript", "klik dig igennem siden", "udfyld formularen".
  Not for web search or refused sites (use research).
---

# Lightpanda

Resolve this file's symlinks first; paths below are relative to its real
directory. The [upstream skill](../../vendor/lightpanda/SKILL.md) is the
reference for commands and flags. These rules take precedence over it.

Pick the first step that works:

1. Search: use Pi's `web_search` when available; it searches through Codex or
   Claude Code. Otherwise use the harness's own search. Send only public search
   terms, not private code or conversation text.
2. Page reading: use Pi's `web_read` when available; it reads pages locally
   with Lightpanda or raw GitHub sources. Otherwise use
   `lightpanda fetch --block-private-networks --dump markdown <url>` before the
   harness's fetch tool, which may return a model's summary instead of the page.
   Add `--wait-selector` or `--wait-ms` when content loads late.
3. Clicking, typing, or multi-page interactions: use Lightpanda MCP tools if the
   session has them. Otherwise write a script following the
   [PandaScript manual](../../vendor/pandascript/SKILL.md) and run it with
   `lightpanda run --block-private-networks <file>.js`.

Never:

- install or update Lightpanda, or run upstream's `scripts/install.sh`.
  Mise installs it from the dotfiles. If `command -v lightpanda` fails,
  tell the user and stop.
- start `lightpanda agent`, which runs Lightpanda's own AI. This agent owns
  the loop. The PandaScript manual says `lightpanda agent script.js`; use
  `lightpanda run` instead.
- use Lightpanda's `search` tool. It calls an outside service.
- leave out `--block-private-networks`, unless the user asks for a local or
  private address such as `localhost:3000`.
- add cookies, credentials, browser profiles, or API keys.
