# Recipes by video type

Lengths, BPM ranges and structures are working conventions, not rules. Most
recipes share one flow: stills in LightCraft and PhotoCraft, the cut and grade
in FilmCraft, titles and graphics in EffectCraft, music and mix in SoundCraft,
final files with ffmpeg.

## Defaults

- Shooting in Denmark (50 Hz mains light): 25 fps at 1/50 s; 50 fps at 1/100 s
  for 2× slow motion; 100 fps at 1/100 s for 4×. Higher rates flicker under
  mains light, so use them in daylight only. iPhone needs "Show PAL Formats"
  for 25 fps.
- Loudness: −14 LUFS and −1 dBTP online; −23 LUFS for broadcast or a venue.
- Vertical 9:16: 1080×1920 with the top 14 %, bottom 35 % and 6 % of each side
  clear of text.
- YouTube upload: MP4 with fast start, H.264 High, AAC 48 kHz, the frame rate
  you shot at, about 8 Mbps at 1080p25.
- Masters: a ProRes or DNxHR master plus the H.264 file; one master per aspect
  ratio rather than re-cropping the delivery.

## The recipes

| Video | Length and format | Structure | Use / avoid | Music | Top mistake |
| --- | --- | --- | --- | --- | --- |
| Family holiday film | 3–8 min 16:9, plus a 30–60 s 9:16 teaser | Cold open on the best moment → title → arrival → chapters by day or theme → emotional peak → quiet outro with place and date | Use the camera's conversion LUT, a light grade, map animations, sparing speed ramps. Avoid flashy transitions and glitch packs | Warm acoustic, 90–120 BPM; piano for the outro | Keeping everything; music with no natural sound under it |
| Wedding or event | Teaser ~60 s; highlight 3–10 min; feature 10–20 min; ceremony 30 min+ | Details → arrivals → ceremony with the vows as the spine → portraits → speeches and first dance → party → send-off | Gentle grade, subtle grain, slow motion only on emotional peaks. Avoid trendy LUTs that crush skin | 60–100 BPM for the build, 110–128 for the party; Content ID-safe if posted | No lav mic on the vows |
| Birthday or memorial tribute | 3–8 min, 4–5 is ideal; 1080p 16:9 | Portrait with name and dates → chronological or themed chapters → recent portrait or quote | 60–100 photos at 3–4 s each, group shots 5–7 s; slow eased Ken Burns, dissolves | Memorial 60–80 BPM, birthday 100–120; 1–3 songs | No playback test on the venue's equipment, no backup |
| Party or event recap | 30–90 s 9:16, plus 1–3 min 16:9 | Hook in 0–3 s → setup → build → peak → wind-down → end card | Cut on the beat but not every beat: at 120 BPM, every 2 beats is 1 s. Avoid strobing | House or pop, 120–128 BPM | Publishing identifiable guests without consent |
| Documentary or interview | 3–15 min 16:9 | Cold-open sound bite → context → character and problem → 2–3 themes → turning point → resolution | J and L cuts, lower thirds, subtle grade. Avoid music under every second | Ambient, 70–100 BPM, under dialogue | No room tone, so gaps drop into dead silence |
| Tutorial or screen recording | 2–3 min per topic; 30 or 60 fps | Show the result → prerequisites → one chapter per step → recap | Zooms, highlights fading over ~1 s, callouts, a pause before each click. Avoid wiggling the cursor | None, or low lo-fi on the intro | Too long and unscripted |
| Explainer with motion graphics | 60–90 s marketing, 2–3 min educational; voice-over at 130–150 words per minute | Problem → solution → how it works → call to action | One motion style, eased moves, kinetic type at most 5–10 words per second | Light, 100–120 BPM | Animating before the voice-over is locked |
| Product video or ad | 15–30 s master, 6 s bumper, 9:16 cut | Hook 0–3 s → reveal 3–8 s → demo 8–20 s → proof → call to action and logo in the last 3–5 s | Speed ramps, push-ins, tracked callouts, text in the safe zone. Avoid misleading demos | Punchy, 110–130 BPM, on a licence tier that covers ads | A music plan that excludes ads |
| Social reel | 15–60 s, 1080×1920 | See [short-form.md](short-form.md) | Animated captions, jump cuts with punch-ins. Avoid text under the app's buttons | Library tracks, not in-app songs, if posted in more than one place | Letterboxed horizontal footage |
| Faceless explainer short | 30–60 s, 1080×1920 | Hook line → 3–5 points, each with matching B-roll → payoff or call to action | Voice-over, B-roll that follows the script, word-by-word captions, quiet music. Avoid random stock clips and clips over 3 s | Quiet bed about 14 dB under the voice | Generic stock look; mass-producing near-identical videos |
| YouTube long-form | 8–20 min 16:9 | Promise in the first 30 s → short intro → chapters → a visual change every 1–2 min → recap and end screen | Punch-ins on jump cuts, lower thirds, map and graph animations. Avoid frantic editing | Beds at 80–110 BPM; YouTube Audio Library is Content ID-safe | A long intro and no chapters |
| Presentation or pitch | 2–5 min 16:9 | Problem → solution → traction → team → the ask | Slide builds, the speaker inset as picture-in-picture. Avoid dense bullets read aloud | 90–110 BPM, intro and outro only | Static slides under a voice-over |
| Music video | Song length, plus 9:16 snippets; 25 fps, or 24 fps only at 1/50 s | Map the song by section; save close-ups for the chorus | Cut interval = 60 ÷ BPM × beats per cut. Don't cut every beat; cuts under 0.5 s need wide or locked-off shots | The artist's master, rights confirmed | Lip sync drifting from a frame-rate mismatch |
| Data or infographic animation | 30–120 s, 16:9 plus 1:1 | Question → baseline → progressive reveal → annotated insight → takeaway with the source | Growing bars and lines, counters, constant axes. Avoid 3D pies and truncated axes | Minimal electronic, 90–110 BPM | A misleading scale, or no source |
| Real-estate walkthrough | 1–2 min, plus a 9:16 cut | Exterior → entry → living areas → standout features → private rooms | Gimbal walks, low-to-high tilts, the same manual exposure in every room. Avoid long static shots | Airy, 90–110 BPM, licensed | Exposure jumping from room to room |
| Sports highlight | Recruiting 3–5 min; social short; 50 fps | Recruiting: ID slide, best plays first, link to the full game. Social: action in the first shot | Mark the athlete before the play, freeze or slow the decisive moment. Never speed up the action itself | 130–150 BPM under the game audio | Cutting off a play's setup or result |
| Timelapse or hyperlapse | 10 s at 25 fps = 250 frames | Interval by subject: calm clouds 3 s+, sunset 3–5 s, stars 20 s+, traffic 2–3 s | Manual exposure, white balance and focus; ND filter for motion blur; deflicker | Ambient, building | Flicker from auto exposure |

## App flows

- Tribute: LightCraft batch-tones the scans → PhotoCraft restores them and puts
  portrait photos over a blurred copy of themselves → FilmCraft lays photos to
  the music's phrases → EffectCraft titles → SoundCraft crossfades and voice clips.
- Wedding: SoundCraft or FilmCraft cleans the vows and speeches first → FilmCraft
  multicam cut that follows the audio → EffectCraft titles → FilmCraft grade →
  SoundCraft mix.
- Interview: transcript → paper edit → FilmCraft audio-only "radio edit" →
  B-roll with J and L cuts → dialogue cleanup with room-tone fill.
- Explainer: record and lock the voice-over → VectorCraft style frames and
  icons → EffectCraft animates to the voice → FilmCraft 16:9 plus 1:1 and 9:16.
- Faceless explainer short: script with the hook first → voice-over (recorded,
  or FilmCraft's text-to-speech) → B-roll search terms in script order, 1–3
  words each with the subject → clips of 1.5–3 s placed under the matching
  words → captions from the transcript → music ducked under the voice →
  1080×1920 export.
- Timelapse: LightCraft batch-develops the RAW frames with an exposure ramp →
  ffmpeg turns the sequence into video → EffectCraft deflickers and stabilises.
