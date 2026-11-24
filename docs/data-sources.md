# Hearts2Hearts data: sources and caveats

Imported by `scripts/import-h2h.mjs` from `db/data/h2h.json` (extracted 2026-11-21). Everything is stored as `draft`; review it in `/admin`, then publish.

```bash
node --env-file=.env.local scripts/import-h2h.mjs            # upsert as draft (safe to re-run)
node --env-file=.env.local scripts/import-h2h.mjs --publish  # publish everything (public pages cache for up to 1 h)
```

## Sources

- Members: [KProfiles member profile](https://kprofiles.com/hearts2hearts-members-profile/) (birth names, birthplaces, heights, MBTI, blood types, pre-debut facts), cross-checked with [GenerAsia](https://www.generasia.com/wiki/Hearts2Hearts) for the group facts. Birth dates agree across all the sources read.
- Releases: [KProfiles discography](https://kprofiles.com/hearts2hearts-discography/), [KProfiles Lemon Tang info](https://kprofiles.com/hearts2hearts-lemon-tang-album-info/) (track durations), GenerAsia pages for [FOCUS](https://www.generasia.com/wiki/Focus_(Hearts2Hearts_mini-album)), [The Chase](https://www.generasia.com/wiki/The_Chase), [Style](https://www.generasia.com/wiki/Style_(Hearts2Hearts)), [Rude!](https://www.generasia.com/wiki/Rude!) and [Lemon Tang](https://www.generasia.com/wiki/Lemon_Tang).
- Context from searches: Soompi, Allkpop, Billboard Brasil, Hanteo, Korea Herald (release and comeback dates).

## Caveats

- These are fan-maintained sites, not an official SM profile. KProfiles itself says some positions are inferred from showcases, so treat **positions** as unofficial (only Jiwoo as Leader is firmly stated). **MBTI** and **height** change over time.
- Real names are as listed by KProfiles; romanisation varies between sites (for example Roh / Noh Yu-na, Lee-an / Yi-an).
- **Lemon Tang** has 6 tracks (including RUDE!) on KProfiles; GenerAsia lists 5 without RUDE!.
- **Single-source releases** (marked in each album's description): FOCUS (Remixes), ScreaM Rookies : The Chase (Remixes), iScreaM : RUDE! (Remixes), and the 2026-08-12 ICONIC HEART (1st Japanese Single).
- Per-track member credits and Spotify/YouTube links were not stated anywhere, so those fields are empty. No photos were imported.

## Found but not imported (no CMS home yet, or exact times unknown)

- Awards (GenerAsia): Seoul Music Awards Rookie of the Year (2025-06-21), Korea Grand Music Awards IS Rising Star, MAMA Awards (Best New Artist Female and others, 2025-11), Melon Music Awards New Artist (2025-12-20), Korea First Brand Awards, Golden Disc Awards Most Popular Artist (2026-01-10).
- Events: HEARTS 2 HOUSE fan meeting at Olympic Hall, Seoul (2026-02-21/22), North American showcases in New York (2026-03-19) and Los Angeles (2026-03-22), fan meeting in Jakarta (2026-03-28). Start times were not found, so they were not added to `events`.
- Group facts: fandom S2U, official colour Sky Blue (KProfiles only), social handles (X, Instagram, TikTok, YouTube, Facebook, Weverse).

## Quiz, Memory Match cards and blog posts (`db/data/content.json`)

Imported by `node --env-file=.env.local scripts/import-content.mjs [--publish]` (idempotent; quiz/card rows are keyed by `payload.key`, posts by slug). Each quiz question and card carries a `source` (label + https URL) that the game shows after the answer / on the reward card. Each post ends with a **Sources** list and is stored as `source = 'ai'` (written by AI from those pages, so the blog shows its AI badge).

Pages read for this content (2026-11-22): KProfiles member profile; GenerAsia (group, FOCUS, RUDE!); SBS Star and The Korea Times (debut, FOCUS, Japan chart/Korean version); Soompi (first-week records, Melon winners, North American stops, Moonride); CJ ENM (MAMA 2025); Kyunghyang Sports and Star News (fan meeting, showcases, Lemon Tang); Otakukart; Korea JoongAng Daily and Asia Economy (Japan debut); Bandwagon (Next Chapter).

Known gaps: the 2 PM vs 8 PM debut-day time conflict between outlets is stated as such in the post; the Seoul Music Awards rookie award is from one source (GenerAsia); Memory Match cards' "fact" text is limited to what KProfiles states and is not an official SM profile.

## YouTube: MV videos, YouTube Music albums and release art (`db/data/youtube.json`)

Imported by `node --env-file=.env.local scripts/import-youtube.mjs` (idempotent). Read on 2026-11-22 from the official Hearts2Hearts YouTube channel (`@hearts2hearts.official`) in a real browser, because YouTube serves no data to plain HTTP fetches:

- **YouTube Music albums:** the channel's *Releases* tab lists each release with its `OLAK…` playlist id → `albums.ytmusic_url` (`https://music.youtube.com/playlist?list=OLAK…`), shown as "Listen on YouTube Music" on /music.
- **In-page playback:** the disc player on /music and the home "Top 5" widget play the track from its album's `OLAK…` playlist through the official YouTube IFrame Player API (`youtube-nocookie.com`), loaded only after the viewer presses play. Spotify links ("Open in Spotify", "Play on Spotify") stay. Tracks YouTube refuses to embed show a note pointing to YouTube Music. Some playlist entries are MV/practice videos because YouTube Music albums include them.
- **Release art:** YouTube Music has no public API. The album's art-track video thumbnail is the cover; its video id comes from YouTube's public oEmbed endpoint for the music.youtube.com playlist. The image URL (`https://i.ytimg.com/vi/<id>/maxresdefault.jpg`) is stored as a `media` row (hotlinked, like X images) and set as `albums.cover_id`. Not found for: ScreaM Rookies : The Chase (Remixes) (not on the channel's Releases tab).
- **MVs:** video ids of the official MV uploads (SMTOWN and Hearts2Hearts channels), checked with oEmbed (title contains "MV") → `tracks.youtube_url`. Releases with no MV on YouTube (Candy Box Lover, RUDE! Japanese ver.) have none. The grid on /music shows each distinct video once, newest first, thumbnails from `i.ytimg.com`, and mounts the privacy-enhanced `youtube-nocookie.com` player only after a click.

## Photos for the image frames (`db/data/photos.json`)

Imported by `node --env-file=.env.local scripts/import-photos.mjs` (idempotent). All images are official promo material from the Hearts2Hearts YouTube channel, hotlinked from `i.ytimg.com` (nothing is copied), credited in `media.credit`, and stored as `media` rows so editors can swap them in the CMS.

- **Members** (avatar, cover and a 4-image gallery each): vertical Shorts thumbnails the channel tagged with only that member's hashtag, hand-picked (one person, face visible, no text overlay). Identity relies on the channel's own hashtag; it was not verified independently.
- **Home hero carousel** (5 era slides) and **blog covers** (6 posts): official MV stills (`hq720`). These carry a baked-in watermark in the lower-left corner, so the carousel is shown in a wider 5:2 frame and blog covers are drawn from the top of the still, which keeps the watermark out of view. Credit stays in `media.credit`.
- **Album covers / disc art**: see the YouTube section above.

Frames still using a placeholder (no public source found): the About page group logo, event posters on /schedule (no events imported yet), and the "Symbol" and "Intro quote" slots on member pages (these need a sourced quote).

## Photocard collection (`db/data/photocards.json`, table `member_era_cards`)

Migration `0009_member_era_cards.sql` + `node --env-file=.env.local scripts/import-photocards.mjs` (idempotent; re-running rewrites the rows from the JSON, so a photo swapped in the CMS is overwritten). One official Short thumbnail (`oar2`, hotlinked from `i.ytimg.com`, credited in `media.credit`) per member per release, read 2026-11-24 from the Shorts tab of `@hearts2hearts.official` (1,214 Shorts, 305 tagged with a single member's hashtag).

- **Era match:** a Short counts for a release when it was uploaded from 14 days before that release (comeback teasers) until 14 days before the next published release. Then hand-picked: one person, face visible, no text overlay. Identity relies on the channel's own hashtag, not verified independently.
- **Remix / language versions** (FOCUS (Remixes), RUDE! (Japanese ver.), ICONIC HEART (Korean ver.)) reuse the photo of their base release (`baseEra` in the JSON). Draft releases have no cards.
- **Pretty Please for Yuha, Stella, Juun, A-na and Ye-on** borrows their FOCUS photo (`fallbackEra` in the JSON; Pretty Please was the pre-release single of FOCUS). That 26-day window had no clean single-member Short for them (Yuha's only one shows two people, Juun's hides the face). All 96 cards have a photo.
