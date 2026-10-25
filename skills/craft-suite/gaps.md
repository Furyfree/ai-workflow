# Gaps and fallbacks

Found on 22 October 2026. The apps change every few days, so test a gap before
routing around it. If the check shows it is fixed, use the normal path and tell
the user so the row can be removed.

| Gap | Check if it still holds | Fallback |
| --- | --- | --- |
| FilmCraft stores speed-ramp keyframes but ignores them when rendering | Ramp a test clip from 100 % to 50 % and `render_frame` the same moment with and without the ramp; identical frames mean it still holds | Ramp in EffectCraft and bring it back as ProRes, or split the clip and set a constant speed per piece |
| No speech-to-text in FilmCraft release builds | `filmcraft-cli commands --json` shows `transcript.generate` with `enabled: false` | Transcribe outside (whisper.cpp) and load the words with `transcript.set` |
| FilmCraft on Linux and Windows cannot open 10-bit or 4:2:2 H.264 and HEVC | Import a 10-bit 4:2:2 test clip; `media.status` reports it unreadable | Transcode to ProRes 422 HQ with ffmpeg first |
| No HEVC or AV1 export from FilmCraft on Linux | `export.formats` lists `hevc` and `av1` as not available | Export a ProRes master and encode with ffmpeg |
| FilmCraft's stabiliser and auto reframe are simpler than EffectCraft's | Render the same shot from each and compare | Stabilise and reframe in EffectCraft |
| SoundCraft has no de-noise, no sidechain and no loudness-meter plugin | `soundcraft-cli plugins` lists none of them | De-noise and duck in FilmCraft's Essential Sound; SoundCraft's bounce still reports LUFS and true peak |
| SoundCraft cannot read AAF or OMF | `soundcraft-cli commands` has no AAF or OMF import | WAV stems plus a picture reference |
| EffectCraft writes ProRes 4444 alpha with the wrong colour tag | EffectCraft's `docs/gaps.md` still lists issue #340 as open | Render a PNG sequence with alpha |
| No halation effect | `effect.list` in EffectCraft has none | A red-tinted Glow on highlights |
| No beat detection in FilmCraft | `filmcraft-cli commands` has none | SoundCraft `event.beat_detective`, converted to FilmCraft markers |
| LightCraft cannot export LUTs | `lightcraft-cli commands` has no LUT export | Build the look in PhotoCraft and export it with `file.export.colorLookupTables` |
| PhotoCraft cannot decode movie files | Loading an .mp4 as a video layer fails | FilmCraft `file.exportFrame` or ffmpeg |
| Roto models are not bundled | `roto.models` shows MobileSAM as not installed | Ask the user to download it once; install with `roto.model.install` after checking the SHA-256 |
| No file drag-and-drop on Wayland | Dragging a file onto the window does nothing | Import by command, or start the app with `env -u WAYLAND_DISPLAY` |
