# Brief, kit and project setup

Licences were checked on the providers' pages in October 2026. Recheck before
paid or client work. Keep a `credits.txt` and the download proof in every
project.

## Brief

- Purpose and the one message
- Audience
- Length, aspect ratios, platforms
- Deadline
- Tone and a reference video
- Music rights: personal or commercial, monetised or not, which platforms
- Footage and photos available, and who has them
- Consent: Datatilsynet judges each case; guests at bars, gyms and private
  events usually must agree before they are published, concert crowds usually
  need not

## Music

| Source | Use it for | Catch |
| --- | --- | --- |
| YouTube Audio Library | Anything going on YouTube | Not claimed by Content ID; CC tracks need credit in the description; treat as YouTube-only |
| Pixabay Music | Any platform, commercial, no credit | Some contributors register Content ID, so claims can happen; keep the download proof |
| Free Music Archive | CC0 and CC BY tracks | Music in a video is a derivative: ND tracks are unusable, NC tracks rule out ads, fundraisers and monetised video |
| Uppbeat | Occasional social video | One credit per track per video; the free plan is small |
| Kevin MacLeod (Incompetech) | Free classic library | CC BY: credit "Kevin MacLeod (incompetech.com)" plus the licence |
| Musopen | Public-domain classical | A given recording can still be under copyright |
| Artlist, Epidemic Sound | Paid, for client work or ads | Entry plans cover only your own channels and no ads; safelist channels before publishing; videos published after cancelling aren't covered |

## Sound effects

| Source | Licence | Catch |
| --- | --- | --- |
| Freesound | Per sound: CC0, CC BY or CC BY-NC | Use CC0 and CC BY only; NC sounds can't go in anything that earns money |
| Pixabay SFX | No credit | No redistributing sounds on their own |
| Zapsplat | Free with credit to "ZapSplat"; Premium without | Commercial and broadcast use allowed |
| Mixkit | Free, no credit | Check each item's licence |
| BBC Sound Effects | Non-commercial, personal or research only | Unusable for monetised or client work |

## Fonts (SIL Open Font Licence, no credit needed)

| Font | Role |
| --- | --- |
| Inter | Captions, lower thirds, slides |
| Bebas Neue or Oswald | Condensed display for hooks, sports, event names; Oswald when lowercase is needed |
| Fraunces | Serif for wedding, memorial and documentary titles |
| Caveat | Handwriting for family, holiday and birthday notes |
| JetBrains Mono | Code, tutorials, data labels |

Check each face has æ, ø and å.

## LUTs, overlays and stock

- Apply the camera's conversion LUT first and any creative LUT after it.
  Official conversion LUTs: Sony (S-Log2/3), DJI (D-Log M), Apple Log (Apple
  Developer downloads), GoPro Labs, Canon, Panasonic V-Log, Blackmagic (inside
  Resolve). Q-DDL's free creative LUTs are CC BY 4.0.
- Make grain instead of downloading packs: ffmpeg `noise=c0s=8:c0f=t+u`, tuned
  between about 6 and 12 by eye. Make light leaks in EffectCraft from blurred
  warm gradients in screen mode at 10–30 %.
- Stock: Pexels and Pixabay (no credit; no reselling unaltered copies, no
  trademarks, no implied endorsement, Pexels no political use), Unsplash
  (photos), Mixkit (check each clip; some can't be used in monetised video).
- Icons: Lucide, Phosphor, Tabler, Material Symbols are fine as pixels in a
  video. OpenMoji is CC BY-SA and needs credit.

## Project folder

```text
YYYYMMDD_project-slug/
  00_admin/     brief.md, consent/, licences/, credits.txt
  01_footage/   camera originals, read-only, plus checksums
  02_audio/     field/, vo/, music/, sfx/, roomtone/
  03_stills/    raw/, selects/, edited/
  04_graphics/  fonts/, logos/, vector/, luts/, overlays/
  05_project/   filmcraft/, effectcraft/, soundcraft/, photocraft/
  06_proxies/   regenerable, left out of the archive
  07_renders/   wip/, review/
  08_exports/   masters/, delivery/
```

Name files `YYYYMMDD_slug_type_variant_v###.ext`, for example
`20261022_crete_highlight_9x16_v003.mp4`. Ask before creating the folder.

## Shooting advice to give the person filming

- Horizontal by default; for both 16:9 and 9:16, shoot 4K horizontally with
  the subject centred
- Lock exposure and focus (press and hold), and white balance where possible
- Hold each shot about 10 s; start and end every move on a still frame
- Walk closer instead of zooming
- Wide, medium, close-up and a cutaway at every location
- 30–60 s of room tone or ambience per place
- A lav mic 15–20 cm from the mouth for anyone speaking, with a backup phone
  recording nearby
- A clap on camera when audio is recorded separately

## Delivery and archive

- Watch every export start to finish, with sound and muted
- Credits in the description; licence proof in `00_admin/licences/`
- Masters and project files with their fonts, LUTs and overlays, so the edit
  reopens
- 3-2-1 backup: three copies, two kinds of media, one off-site; drop proxies
  and renders
