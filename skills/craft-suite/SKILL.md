---
name: craft-suite
description: Drive the ArtCraft apps - FilmCraft, EffectCraft, SoundCraft, PhotoCraft, VectorCraft, LightCraft - through their CLIs and MCP servers to make a video. Use when the user says "edit it in FilmCraft", "use EffectCraft", "make it with ArtCraft", "klip det i FilmCraft", "lav det i ArtCraft", or when a video task needs one of these apps. Not for choosing a concept or an effect (use video-ideas or video-effects) or for plain ffmpeg conversions.
---

# Craft suite

## Which app

- FilmCraft: cutting, transitions, effects, Lumetri colour, masks, captions,
  simple titles, dialogue cleanup, ducking, export.
- EffectCraft: speed ramps, tracking, stabilisation, roto, object removal,
  kinetic type, maps, counters, logo reveals, 3D.
- SoundCraft: music cut to length, beat detection, EQ, compression, reverb,
  stems with a loudness report.
- PhotoCraft: stills, restoration, clean plates, layered PSDs for parallax,
  LUTs from adjustment layers, batches of title cards.
- VectorCraft: logos, icons, arrows and map routes as SVG or PNG.
- LightCraft: photos and RAW timelapse frames. No video.

Technique by technique: [capability-map.md](capability-map.md).
What does not work yet, and the fallback: [gaps.md](gaps.md).

## Before any command

1. Check the app is installed: `command -v filmcraft-cli`. If not, tell the
   user and stop. Never install or update an app.
2. The apps are alpha and release every few days; the maps here were checked
   on 22 October 2026. Treat every command name in them as a starting point:
   confirm it and its parameters with `<app>-cli commands --json` (FilmCraft
   and SoundCraft also have `describe <id>`). Say when a name has changed.
3. Test a gap before routing around it; each row in gaps.md says how.
4. Work inside the project folder. Never write into camera originals.

## Driving the apps

- FilmCraft: `filmcraft-cli --project p.fcproj --save exec <id> key=value`, or
  `run steps.jsonl` with one `{"id", "params"}` per line. MCP: `command_run`,
  `command_batch`, `sequence_inspect`, `render_frame`. Time is in ticks,
  254,016,000,000 per second; most commands also accept `seconds`.
- EffectCraft: MCP `add_keyframe`, `add_effect`, `batch` (one undo step that
  can reference earlier results), `run_script` (After Effects-style object
  model). Render with `effectcraft-cli render P.ecproj --comp C --out F --format prores`.
- SoundCraft: MCP `execute`, `batch`, `bounce_mix`; or
  `soundcraft-cli script steps.txt --in s.scraft --bounce mix.wav`.
- PhotoCraft: MCP `command_run`, `command_batch`; or
  `photocraft-cli batch --actions a.json --in DIR --out DIR --format png`.

## Pitfalls

Seen on 22 October 2026; if one no longer matches what the app does, trust
the app.

- Send FilmCraft and PhotoCraft MCP requests one at a time; their order is not
  guaranteed. Use `command_batch` for a sequence.
- FilmCraft has two time bases: `effects.setParam` and `effects.addKeyframe`
  take timeline `time`; `effects.setKeyframe`, `effects.setInterpolation` and
  `effects.deleteKeyframe` take the clip's `mediaTime`. EffectCraft keyframes
  default to layer time; pass `timeBase: "comp"`.
- FilmCraft effect indexes differ per clip. Read them from `sequence_inspect`.
- Selection-only commands such as `clip.nest` need `timeline.select` first.
- Start EffectCraft's MCP server with `--autosave`, or save after each step;
  headless work is lost on restart.
- FilmCraft's MCP server has no folder limits. Keep its work in the project.
- A command that returns success has not proven the picture changed. Check with
  `render_frame` or a rendered frame before moving on.

## Hand-offs

- FilmCraft → SoundCraft: WAV 48 kHz 24-bit plus an H.264 or ProRes picture
  reference. Back: `file.bounce_mix` or `file.bounce_stems` as WAV.
- EffectCraft → FilmCraft: PNG sequence with alpha, then
  `file.importImageSequence`. For ProRes 4444 with alpha, see gaps.md.
- FilmCraft → EffectCraft: `file.exportInterchange {format: xml}`, then
  `file.importTimeline`. There is no live link.
- VectorCraft → EffectCraft: SVG with `edit.pasteSvg`. VectorCraft →
  FilmCraft: PNG at sequence size with `graphics.newFromFile`.
- PhotoCraft → FilmCraft: `.cube` from `file.export.colorLookupTables`, then
  `lut.import`.
- Templates do not cross apps: FilmCraft `.fcgt` and EffectCraft `.ectemplate`
  are separate, and neither opens `.mogrt`.
