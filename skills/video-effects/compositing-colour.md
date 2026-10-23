# Compositing, masks, colour and looks

Good compositing is invisible. Correct and match every shot first, add the
look once at the end, and protect skin tones throughout. The App column names
where to start; commands and known gaps are in the craft-suite skill.

## Compositing and masks

| Technique | Flag | Use for | Avoid | How | App |
| --- | --- | --- | --- | --- | --- |
| Track mattes | Timeless | Text reveals, footage inside shapes, organic transitions | A matte not directly above its content | Alpha, alpha inverted, luma or luma inverted; animate one text layer as the matte | FilmCraft, EffectCraft |
| Masked reveal, text behind a person | Contextual; overused on social | Openers, ads, music video | Chattering edges | Duplicate the footage above the text and cut the person out on the top copy | EffectCraft |
| Rotoscoping | Timeless need | Isolating a subject | Expecting one click | Start on the clearest frame, paint subject and background, propagate, check every frame, refine hair, 1–3 px feather | EffectCraft |
| Object removal, clean plate | Timeless repair | Exit signs and mic stands, rigs in product shots | Water and busy textures | Mask the object; fill by object for moving, surface for static; remove the shadow separately; shoot a 3–5 s clean plate | EffectCraft, PhotoCraft |
| Green screen | Timeless | Presenters, explainers, composites | Uneven screen light; subject close to the screen | Garbage matte, sample the green near the subject, push the matte to solid black and white, shrink the edge slightly, suppress spill; finish with light wrap, colour match and grain. Shoot at 1/80 s or faster | FilmCraft, EffectCraft |
| Motion-tracked text | Timeless | Product callouts, travel labels, sports | Drift | Track a high-contrast point, apply it to a null, parent the text; camera-track surfaces in perspective | EffectCraft |
| Sky replacement | Contextual; dramatic skies overused | Property, travel, ads | Docs and journalism; sun direction that contradicts the shadows | Camera track, new sky on the tracked plane, key the old sky, colour-match the foreground | PhotoCraft (stills), EffectCraft (video) |
| Blur and redaction | Timeless | Children at events, number plates, private screens | Gaussian blur for legal redaction | Mosaic or a solid box on a tracked mask, extended 4 frames either side; check every frame | FilmCraft, EffectCraft |
| Light wrap | Timeless, subtle | Keyed subjects | A visible glow | Blurred background (20–60 px) masked to a thin inner edge, screen at 20–50 % | EffectCraft |
| Shadows for composites | Timeless | Inserted objects and text | Shadows pointing the wrong way | A shadow-catcher plane in multiply with a light matching the plate; for text, 30–60 % drop shadow, 2–6 px distance | EffectCraft |

## Colour and looks

| Technique | Flag | Use for | Avoid | How | App |
| --- | --- | --- | --- | --- | --- |
| Correct, then grade | Timeless | Every project | A look over uncorrected shots | Camera conversion LUT, then balance and match to a hero shot, then local fixes, then the look once at the end | FilmCraft |
| Matching cameras | Timeless | Weddings, events, phone + drone + camera | One LUT for all exposures | Exposure on the waveform, white balance on the parade or vectorscope, then colour; grain glues shots. Shoot a grey card and fixed white balance | FilmCraft |
| Technical vs creative LUTs | Timeless distinction | Log footage (technical); a look (creative) | A creative LUT as default; stacking two | Technical first; creative last at 30–60 % strength | FilmCraft |
| Film look | Timeless when subtle; heavy presets overused | Weddings, tributes, family films, music video | Tutorials, product accuracy, screen recordings | Grain ~15–20 % in overlay or soft light after the grade; halation as a faint red glow on bright edges (10–40 px blur at 1080); gate weave ≤ 1 px at 1080. Export at high bitrate or compression smears the grain | EffectCraft, FilmCraft |
| Vignette | Timeless if subtle | Interviews, close-ups, nostalgia | A visible ring; centred on an off-centre subject | Amount about −1.5, midpoint 40–60, high feather; for off-centre subjects a tracked feathered mask | FilmCraft |
| Black and white | Timeless | Flashbacks, archive blending, unifying mismatched cameras | Plain desaturation | Channel mixer in monochrome; lower red to darken skin, raise it to brighten; contrast curve and fine grain | FilmCraft |
| Teal and orange | Overused as a default | Action and ads when wardrobe and light support it | Romance, period, docs, forests, oceans | Cyan nudge in shadows, warmth in highlights, skin protected with a qualifier; check on a phone | FilmCraft |
| Skin tones | Timeless priority | Anything with people | Orange or green skin | White balance first; on the vectorscope every skin tone sits on the line between yellow and red; pull stray hue onto it | FilmCraft |
| HDR vs SDR | Timeless technical | HDR only when the delivery needs it | Grading in P3 but tagging Rec.2020 | Default to SDR Rec.709 and tone-map phone HDR; YouTube HDR needs PQ or HLG, Rec.2020, 10-bit | ffmpeg, FilmCraft |
