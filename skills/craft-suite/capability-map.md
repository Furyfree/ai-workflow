# Capability map

Starting points, checked on 25 October 2026. Before using a command, confirm
it and read its parameters in the installed app: `<app>-cli commands --json`
lists every command with its parameters (SoundCraft: plain `commands`;
`--json` prints nothing), FilmCraft and SoundCraft also have `describe <id>`,
and EffectCraft has the command `command.describe`. Effects and transitions
are listed by `effects.list` (FilmCraft) and `effect.list` (EffectCraft). If a name is gone, search the
listing for the technique and tell the user. Known limits are in
[gaps.md](gaps.md).

| Technique | App | Commands, effects or templates |
| --- | --- | --- |
| Cuts, J and L cuts | FilmCraft | `timeline.razor`, `timeline.trim`, `timeline.roll`, `markers.markSplitAudioIn` |
| Dissolve, dip to black or white | FilmCraft | `sequence.applyVideoTransition` with `cross_dissolve`, `dip_to_black`, `dip_to_white`; audio `constant_power` |
| Whip and zoom transitions | FilmCraft | Transitions `whip`, `cross_zoom`, `zoom_blur`, `push` |
| Mask wipe | FilmCraft, EffectCraft | FilmCraft `masks.add`, `masks.set`; EffectCraft Linear Wipe, preset `wipeInFromLeft` |
| Light leak, glitch | FilmCraft | Transitions `light_leak`, `glitch`, `vhs_damage`; effects `light_leaks`, `rgb_split` |
| Speed ramp | FilmCraft, EffectCraft | FilmCraft `clip.speedDuration`, `time_remap` keyframes; EffectCraft `layer.enableTimeRemap`, `keys.easyEase`, Timewarp |
| Slow motion | FilmCraft | `clip.speedDuration`, `clip.setTimeInterpolation` |
| Freeze frame, reverse | FilmCraft | `clip.insertFrameHoldSegment`, `clip.frameHold`, `clip.speedDuration` |
| Punch-in zoom, Ken Burns | FilmCraft | `effects.setParam` on `motion`, `effects.setInterpolation`; effect `grow` |
| 2.5D parallax | PhotoCraft, EffectCraft | PhotoCraft `select.subject`, `edit.contentAwareFill`; EffectCraft `file.import`, `layer.newCamera`, `camera.dolly` |
| Reframe to 9:16 | FilmCraft, EffectCraft | FilmCraft `file.newSequence`, effect `auto_reframe`; EffectCraft `track.motion`, `track.apply`, `layer.setParent` |
| Stabilisation | EffectCraft, FilmCraft | EffectCraft `track.warpStabilizer`; FilmCraft effect `warp_stabilizer` |
| Split screen, picture-in-picture | FilmCraft | Effects `crop`, `rounded_crop`, `drop_shadow`; `presets.apply` |
| Lower thirds, titles, credits, callouts | FilmCraft, EffectCraft | FilmCraft `graphics.template.list`, `graphics.template.apply`; EffectCraft templates |
| Kinetic typography | EffectCraft | `layer.addTextAnimator`, `layer.addTextSelector`, `layer.applyTextPreset` |
| Captions | FilmCraft | `transcript.set`, `transcript.createCaptions`, `captions.setStyle`, `captions.export`; burn in with `file.exportMedia` |
| Text-to-speech narration | FilmCraft | `tts.create` |
| Arrows, map routes | EffectCraft | `shape.newPath`, `layer.addShapeItem`, `layer.autoOrient`; SVG via `edit.pasteSvg` |
| Counters | EffectCraft | Numbers effect, or a slider driving a text expression |
| Logo reveal | EffectCraft | Logo-reveal template; Light Sweep, Glow, Shatter effects |
| Track mattes, masked reveals | FilmCraft, EffectCraft | FilmCraft effect `track_matte`; EffectCraft `layer.setTrackMatte`, `layer.addMask` |
| Rotoscoping | EffectCraft | `roto.stroke`, `roto.propagate`, `roto.freeze`, `objectMatte.apply` |
| Object removal | EffectCraft, PhotoCraft | EffectCraft `contentFill.generate`; PhotoCraft `edit.contentAwareFill` |
| Green screen | FilmCraft, EffectCraft | FilmCraft effect `ultra_key`; EffectCraft Key Light, Key Cleaner, Advanced Spill Suppressor |
| Motion tracking | EffectCraft | `track.motion`, `track.analyze`, `track.apply`, `track.camera` |
| Sky replacement | PhotoCraft, EffectCraft | PhotoCraft `select.sky`; video by key or roto plus `track.camera` |
| Blur and redaction | FilmCraft, EffectCraft | FilmCraft effects `mosaic`, `gaussian_blur` with `masks.add`, `masks.track`; EffectCraft `track.mask` |
| Colour correction and matching | FilmCraft | Effect `lumetri`, `lumetri.applyMatch`, `scopes.read` |
| LUTs | FilmCraft, PhotoCraft | FilmCraft `lut.import`, `lumetri.setInputLut`, `lumetri.setLook`; PhotoCraft `file.export.colorLookupTables` |
| Film look | EffectCraft, FilmCraft | EffectCraft Add Grain, Glow; FilmCraft Lumetri vignette |
| Black and white | FilmCraft | Effect `black_white`; `lumetri.applyPreset` |
| Dialogue cleanup | FilmCraft | `essentialSound.set` repair keys; effects `denoise`, `dereverb`, `speech_enhance` |
| EQ, compression, reverb | SoundCraft | `mix.insert` with `eq_7band`, `compressor`, `de_esser`, `channel_strip`, `room_reverb`, `plate_reverb`; `mix.send` |
| Ducking | FilmCraft | `essentialSound.setType`, `essentialSound.set` ducking keys, `essentialSound.generateDucking` |
| Music to length | FilmCraft, SoundCraft | FilmCraft `clip.remix`; SoundCraft `edit.separate_on_grid`, `edit.heal`, `edit.fades_create` |
| Beat markers | SoundCraft, FilmCraft | SoundCraft `event.beat_detective` (beats in samples); FilmCraft `markers.add`. Ticks = samples × 254,016,000,000 ÷ sample rate |
| Loudness | FilmCraft, SoundCraft | `essentialSound.autoMatch`, `file.exportMedia`; SoundCraft `file.bounce_mix` reports peak, true peak and LUFS |
| Export | FilmCraft | `file.exportMedia`; `filmcraft-cli export --list-presets` lists presets; `export.formats` shows what this build can write |
