# Capability map

Checked on 22 October 2026 by running each app's command listing. Parameters
are trimmed to the important ones; confirm the full shape with the installed CLI.

Maturity: works per the app's docs, partial if approximate, missing if absent.

| Technique | App | Commands | Maturity |
| --- | --- | --- | --- |
| Cuts, J and L cuts | FilmCraft | `timeline.razor`, `timeline.trim {mode: ripple}`, `timeline.roll`, `markers.markSplitAudioIn` | Works |
| Dissolve, dip to black or white | FilmCraft | `sequence.applyVideoTransition {effect: cross_dissolve, frames}`, also `dip_to_black`, `dip_to_white`; audio `constant_power` | Works |
| Whip and zoom transitions | FilmCraft | Transitions `whip {direction, blur}`, `cross_zoom`, `zoom_blur`, `push` | Works |
| Mask wipe | FilmCraft, EffectCraft | FilmCraft `masks.add` plus keyed `masks.set {path, time}`; EffectCraft Linear Wipe or preset `wipeInFromLeft` | Works |
| Light leak, glitch | FilmCraft | Transitions `light_leak`, `glitch`, `vhs_damage`; effects `light_leaks {mode: Screen}`, `rgb_split` | Works |
| Speed ramp | EffectCraft | `layer.enableTimeRemap`, keys on `timeRemap` with `keys.easyEase`, or Timewarp with Pixel Motion | Works; FilmCraft ramp keyframes do not render |
| Slow motion | FilmCraft | `clip.speedDuration {speed: 50, interpolation: opticalFlow}` | Works; optical flow is CPU-only |
| Freeze frame, reverse | FilmCraft | `clip.insertFrameHoldSegment {seconds}`, `clip.speedDuration {reverse: true}` | Works |
| Punch-in zoom, Ken Burns | FilmCraft | `effects.setParam {effect: motion, param: scale, keyframe: true}` then `effects.setInterpolation {interpolation: easeOut}`; or the `grow` effect | Works |
| 2.5D parallax | PhotoCraft, EffectCraft | PhotoCraft `select.subject`, `edit.contentAwareFill`, save PSD; EffectCraft `file.import {importAs: compositionLayerSizes}`, 3D switch, `layer.newCamera`, `camera.dolly` | Works |
| Reframe to 9:16 | FilmCraft, EffectCraft | FilmCraft `file.newSequence {width: 1080, height: 1920}` plus `auto_reframe {aspect: "Vertical 9:16"}`; tracked: EffectCraft `track.motion` to a null, then parent | FilmCraft partial (heuristic); EffectCraft works |
| Stabilisation | EffectCraft | `track.warpStabilizer {wait}` (Subspace Warp available) | Works; FilmCraft's version is 2D only |
| Split screen, picture-in-picture | FilmCraft | `crop`, `rounded_crop {radius, border}`, preset `PiP 35% Upper Right`, `drop_shadow` | Works |
| Lower thirds, titles, credits, callouts | FilmCraft | `graphics.template.apply {template: "builtin:lower-third-slab", values: {Name, Role}}`; also `builtin:title-centered`, `builtin:end-credits-roll`, `builtin:callout-pointer` | Works |
| Kinetic typography | EffectCraft | `layer.addTextAnimator`, `layer.addTextSelector`, `layer.applyTextPreset {preset: trackingIn}`; template `kinetic-type` | Works |
| Captions | FilmCraft | `transcript.set` (words from external Whisper), `transcript.createCaptions {maxChars, lines}`, `captions.setStyle`, export with `burnCaptions` or `captions.export {format: srt}` | Partial: no speech-to-text in release builds |
| Text-to-speech narration | FilmCraft | `tts.create {text, voice, pace, time, track}` | Works; check the voice quality |
| Arrows, map routes | EffectCraft | `shape.newPath`, `layer.addShapeItem {kind: trim}` with keys on the trim end, `layer.autoOrient`; SVG via `edit.pasteSvg` | Works |
| Counters | EffectCraft | Numbers effect, or a slider driving a text expression | Works |
| Logo reveal | EffectCraft | Template `logo-reveal`; CC Light Sweep, Glow, Shatter | Works |
| Track mattes, masked reveals | FilmCraft, EffectCraft | FilmCraft `track_matte`; EffectCraft `layer.setTrackMatte {kind: luma}`, keys on `masks/#1/path` | Works |
| Rotoscoping | EffectCraft | `roto.stroke`, `roto.propagate {wait}`, `roto.freeze`; `objectMatte.apply` | Partial; install the MobileSAM model first |
| Object removal | EffectCraft, PhotoCraft | `contentFill.generate {method: object}`; clean plate with PhotoCraft `edit.contentAwareFill` | Partial |
| Green screen | FilmCraft, EffectCraft | FilmCraft `ultra_key`; EffectCraft Key Light (`ec.keying.keylight`), Key Cleaner, Advanced Spill Suppressor | Works |
| Motion tracking | EffectCraft | `track.motion`, `track.analyze {wait}`, `track.apply`; `track.camera` for 3D | Works |
| Sky replacement | PhotoCraft, EffectCraft | Stills: PhotoCraft `select.sky`. Video: key or roto plus `track.camera` | Partial; no video sky tool |
| Blur and redaction | FilmCraft, EffectCraft | `mosaic` or `gaussian_blur` with `masks.add` and `masks.track {wait}`; faces with EffectCraft `track.mask {method: faceOutline}` | Works |
| Colour correction and matching | FilmCraft | `lumetri` parameters, `lumetri.applyMatch {referenceTime}`, `scopes.read` | Works |
| LUTs | FilmCraft | `lut.import`, `lumetri.setInputLut`, `lumetri.setLook`; built-in input LUTs for S-Log3, V-Log, C-Log2/3, LogC3/4, Apple Log, D-Log | Works |
| Film look | EffectCraft, FilmCraft | EffectCraft Add Grain (Fine 35mm, Coarse 16mm, Vintage 8mm); Lumetri vignette; halation by hand with a red Glow | Partial: no halation effect |
| Black and white | FilmCraft | `black_white`, or Lumetri presets Neutral Mono and Hard Mono | Works |
| Dialogue cleanup | FilmCraft | `essentialSound.set` keys `repair.noise.*`, `repair.dehum.*`, `repair.deess.*`; effects `denoise`, `dereverb`, `speech_enhance` | Works (signal processing, not AI) |
| EQ, compression, reverb | SoundCraft | `mix.insert {plugin: eq_7band}`, also `compressor`, `de_esser`, `channel_strip`; reverb on a bus with `room_reverb` or `plate_reverb` | Works |
| Ducking | FilmCraft | `essentialSound.setType {type: music}`, keys `ducking.*`, `essentialSound.generateDucking` | Works (keyframes); SoundCraft has no sidechain |
| Music to length | FilmCraft, SoundCraft | FilmCraft `clip.remix {seconds}`; SoundCraft `edit.separate_on_grid`, `edit.heal`, crossfades | Works |
| Beat markers | SoundCraft, FilmCraft | SoundCraft `event.beat_detective` returns beats in samples; ticks = samples × 254,016,000,000 ÷ sample rate; FilmCraft `markers.add {time}` | Works with that conversion |
| Loudness | FilmCraft, SoundCraft | `essentialSound.autoMatch {target}`, `file.exportMedia {loudnessLufs}`; SoundCraft `file.bounce_mix` reports peak, true peak and LUFS | Works |
| Export | FilmCraft | `file.exportMedia {path, preset}`; presets include "YouTube 1080p Full HD", "Social Vertical 1080×1920", "Apple ProRes 422 HQ" | Works; no HEVC or AV1 on Linux |
