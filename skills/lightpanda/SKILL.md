---
name: lightpanda
description: >
  Browse pages that need JavaScript, clicks, or forms with the Lightpanda
  headless browser. Use for "open this page in a browser", "the page needs
  JavaScript", "click through the site", "fill in the form", "scrape this
  site", "use lightpanda", "åbn siden i en browser", "siden kræver
  JavaScript", "klik dig igennem siden", "udfyld formularen".
  Not for plain web search or static pages the native fetch tool can read.
---

# Lightpanda

Resolve this file's symlinks first; paths below are relative to its real
directory. Read the [upstream skill](../../vendor/lightpanda/SKILL.md) and
use its guidance with these local exceptions, which take precedence over
conflicting upstream instructions:

- Never install or update Lightpanda, and never run upstream's
  `scripts/install.sh`. Mise installs it from the dotfiles. If
  `command -v lightpanda` fails, tell the user and stop.
- Use the harness's own web search and fetch first. Use Lightpanda only
  when the page needs JavaScript, navigation, interaction, or rendered state.
- Pass `--block-private-networks` to every command, so a public page cannot
  lead the browser to localhost or the local network. Only omit it when the
  user asks to browse a local or private address.
- Read one page with `lightpanda fetch --dump markdown`.
- Interact through Lightpanda MCP tools when the session has them.
  Otherwise write a PandaScript file and replay it with `lightpanda run`;
  see the [PandaScript skill](../../vendor/pandascript/SKILL.md), but run
  scripts with `lightpanda run`, not `lightpanda agent`.
- Never start `lightpanda agent`: this agent already owns the loop.
- Never add cookies, credentials, browser profiles, or API keys.
