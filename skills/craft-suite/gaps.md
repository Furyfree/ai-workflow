# Gaps and fallbacks

Checked on 22 October 2026. Recheck after updating an app.

| Gap | Affects | Fallback |
| --- | --- | --- |
| FilmCraft stores speed-ramp keyframes but ignores them on playback and export | Speed ramps | Ramp in EffectCraft and bring it back as ProRes, or split the clip and set a constant speed per piece. Check with `render_frame` |
| No speech-to-text in FilmCraft release builds | Captions, transcript editing, filler removal | Transcribe outside (whisper.cpp) and load the words with `transcript.set` |
| FilmCraft on Linux cannot open 10-bit or 4:2:2 H.264 and HEVC; iPhone HEVC exports have stalled | Most mirrorless footage, some phones | Transcode to ProRes 422 HQ with ffmpeg first |
| No HEVC or AV1 export on Linux | Smaller delivery files | Export a ProRes master and encode with ffmpeg |
| SoundCraft has no de-noise, no sidechain and no loudness-meter plugin | Dialogue cleanup, ducking | De-noise and duck in FilmCraft's Essential Sound; SoundCraft's bounce still reports LUFS and true peak |
| SoundCraft cannot read AAF or OMF | Moving a whole edit's audio | WAV stems plus a picture reference |
| EffectCraft ProRes 4444 alpha has the wrong colour tag (#340) | Graphics over footage | Render a PNG sequence with alpha |
| No halation effect | Film look | A red-tinted Glow on highlights in EffectCraft |
| No beat detection in FilmCraft | Beat-synced cutting | SoundCraft `event.beat_detective`, converted to FilmCraft markers |
| LightCraft cannot export LUTs | Matching photo looks to video | Build the look in PhotoCraft; export with `file.export.colorLookupTables` |
| PhotoCraft cannot decode movie files | Stills from video | FilmCraft `file.exportFrame` or ffmpeg |
| EffectCraft has no hardware encoding | Slow 4K renders | Render ProRes or PNG intermediates; encode deliveries with ffmpeg |
| Roto and face models download at run time | Offline or sandboxed runs | Ask the user to download once; install with `roto.model.install {path}` after checking the SHA-256 |
| No file drag-and-drop on Wayland; audio stutter in FilmCraft and EffectCraft | Interactive use | Import by command; start the app with `env -u WAYLAND_DISPLAY` when dragging matters |
