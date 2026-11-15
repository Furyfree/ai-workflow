---
name: lightpanda
description: >
  Read a page's exact text, or browse pages that need JavaScript, clicks, or
  forms, with Lightpanda, and with Brave when a site blocks it. Use for "read
  this page", "open this page in a browser", "the page needs JavaScript",
  "click through the site", "fill in the form", "scrape this site", "use
  lightpanda", "læs siden", "åbn siden i en browser", "siden kræver
  JavaScript", "klik dig igennem siden", "udfyld formularen".
  Not for web search or facts from several sources (use research).
---

# Lightpanda

Resolve this file's symlinks first; paths below are relative to its real
directory. The [upstream skill](../../vendor/lightpanda/SKILL.md) is the
reference for commands and flags. These rules take precedence over it.

Pick the first step that works:

1. Search: use Pi's `web_search` when available; it searches through Codex or
   Claude Code. Otherwise use the harness's own search. Send only public search
   terms, not private code or conversation text.
2. Page reading: the harness's fetch tool is fine for skimming pages or pulling
   one fact, but it returns a model's summary, and Codex's search reads a saved
   copy that may be old. When you need the exact text, such as docs, settings,
   code, numbers, or prices, or the built-in tool fails or misses the detail:
   use Pi's `web_read` when available; it reads pages locally with Lightpanda
   or raw GitHub sources. Otherwise use
   `lightpanda fetch --block-private-networks --dump markdown <url>`.
   Add `--wait-selector` or `--wait-ms` when content loads late.
3. Lightpanda gets a 403, a bot check, or an empty page: read it with Brave in
   the hidden desktop when the session has the `agent-workspace-linux` tools.
   Otherwise tell the user the site blocked it.
   - Make an empty temporary folder holding a `Local State` file with
     `{"brave":{"origin":{"free_tier_accepted":true}}}`, which skips Brave
     Origin's welcome page.
   - Start the workspace with `open_viewer: false` unless one is running.
     Open Brave with `workspace_open_browser`, the folder as `user_data_dir`,
     and no `browser_path`, then `workspace_browser_navigate` to the page. Its
     result holds the page text.
   - Stop the workspace if you started it, then delete the folder.
4. Clicking, typing, or multi-page interactions: use Lightpanda MCP tools if the
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
- add cookies, credentials, or API keys, or use an existing browser profile.
- click past a certificate warning or a CAPTCHA. Report it instead.
