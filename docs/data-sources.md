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
