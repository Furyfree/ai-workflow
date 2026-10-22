# Sound, music and mixing

Sound carries more of the feeling than the picture. Keep room tone under every
cut, duck music under speech, save sound effects for real changes, and use
silence on purpose.

| Technique | Flag | Use for | Avoid | How | ArtCraft |
| --- | --- | --- | --- | --- | --- |
| Room tone and ambience | Timeless | Under dialogue, filling gaps, smoothing cuts | Digital silence in gaps | Record 30–60 s per location; ambience on its own track with 10–30 frame crossfades; change it at scene changes, leading in with a J cut | FilmCraft `essentialSound.setType {type: ambience}`; SoundCraft `edit.paste_repeat_to_fill` |
| Foley | Timeless | Product videos especially; cloth, clicks, pours | Heavy processing | Layer library sounds in sync within ±1 frame, on a shared reverb | FilmCraft or SoundCraft |
| Whooshes, risers, hits | Contextual; overused on every cut | Ads, trailers, sports, explainers, real scene shifts | Ceremonies and tributes; bright sounds over dark scenes | Whoosh length matches the motion, peak on or 1–2 frames before the cut; a riser ends exactly on the hit; 1–3 frames of silence before a big impact; dip music 3–6 dB | SoundCraft Spot mode, `clip.identify_sync_point` |
| Sound bridges | Timeless | Docs, weddings (vows over the reception), travel, tributes | One on every transition | Lead the next scene's sound 0.5–2 s early, or run music across chapters | FilmCraft J and L cuts |
| Ducking | Timeless | Music under any speech | Pumping; ducking that blurs words | Music 8–15 dB under speech with 300–800 ms fades; let it swell back in gaps over ~1.5 s | FilmCraft `essentialSound.generateDucking` |
| Dialogue chain | Timeless | Every voice | Over-processing (flanged or underwater sound) | Clip gain, then noise reduction (6–30 dB from a ≥ 0.5 s noise print), EQ (high-pass 60–80 Hz, cut mud at 300–800 Hz), de-esser under 4 dB, compressor ≤ 6 dB reduction, limiter | FilmCraft `essentialSound.set repair.*`, `denoise`; SoundCraft `eq_7band`, `compressor`, `de_esser` |
| Reverb for space | Timeless | Matching voice-over to a room; dream-like flashbacks | Wet narration | On a send bus, high-pass the return at ~200 Hz, keep realistic reverb barely noticeable | SoundCraft `room_reverb`, `plate_reverb` on a bus |
| Music to length | Timeless | Every piece with music | Seams in lyrics, harmony or reverb tails | Place the ending first so the last hit lands on the last frame; cut chorus to chorus on downbeats; 5–30 ms crossfades on hits, longer under pads | FilmCraft `clip.remix`; SoundCraft `edit.separate_on_grid` |
| Stingers | Contextual | Logo reveals, chapter cards, jokes | Solemn pieces | 0.5–3 s hit plus tail, one family per project, in the score's key | — |
| Silence | Timeless | Vows, tributes, punchlines, reveals | Pure digital zero (sounds like a fault) | Pull music 0.5–2 s before the key line, leave room tone under it | — |
| Loudness | Timeless technical | Every delivery | Over-squashing for platforms that turn you down anyway | Anchor on dialogue; limiter ceiling −1 dBTP (−2 for broadcast); −14 LUFS online, −23 LUFS broadcast; check on a phone | FilmCraft `file.exportMedia {loudnessLufs}`; SoundCraft bounce report |

Music tempo for pacing: 70–90 BPM calm, 90–110 medium, 110–130 energetic,
130–150 sport. Frames per beat = (60 ÷ BPM) × fps; at 120 BPM and 25 fps that
is 12.5 frames.
