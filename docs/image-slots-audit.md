# Image frames audit (2026-11-22)

Which image frames on the public site still show a placeholder, and what was found for each.
Rule used: only fill a frame with an image whose source **and** licence are clear (official press/promo,
Wikimedia Commons, Unsplash). Nothing was filled from a source whose licence could not be checked.

## Frames already filled (when the database is imported)

Filled by `scripts/import-photos.mjs` / `scripts/import-youtube.mjs` (see `docs/data-sources.md`): member avatars,
covers and galleries, home hero cards and era carousel, photocards, blog covers, album covers and disc art.
Source: official Hearts2Hearts / SMTOWN YouTube uploads, hotlinked from `i.ytimg.com`, credited in `media.credit`.
Licence: SM Entertainment, all rights reserved (official promo, not openly licensed).

Without a database (`hasDb()` false) the seed data is used and **every** frame shows its design gradient. That is
by design (`CLAUDE.md`: seed = design data).

## Frames still empty

| Frame (location) | Code | Candidates found | Source | Licence | Status |
|---|---|---|---|---|---|
| About hero, "official group logo" | `src/app/(public)/about/page.tsx` (hard-coded `TODO` chip) | Wordmark image on a third-party logo site | [1000logos.net/hearts2hearts-logo](https://1000logos.net/hearts2hearts-logo/) | None stated. Third-party re-upload of an SM trademark | Not filled: no official or openly licensed file found |
| Event poster in the schedule drawer | `src/components/schedule/EventDrawer.tsx` (gradient `STATUS_STYLE.poster`; `events.poster_id` is not rendered) | None. No events are imported yet (see `docs/data-sources.md`) | n/a | n/a | Not filled: needs events + poster wiring first |
| Album cover, *ScreaM Rookies : The Chase (Remixes)* | `albums.cover_id` (import data) | None. The release is not on the channel's Releases tab | [GenerAsia: The Chase](https://www.generasia.com/wiki/The_Chase) (original single only) | n/a | Not filled |
| Member page "Photocard collection" | `src/components/members/EraCards.tsx` | Not a photo slot (era colour cards in the design) | n/a | n/a | Leave as designed |

## Searches made

- Wikimedia Commons / English Wikipedia (logo, group photos): the Commons and Wikipedia hosts are blocked by this
  cloud session's network policy, so the file pages and licences could not be read. Web search found no Commons file
  for Hearts2Hearts. A Wikipedia mirror shows a "Hearts2Hearts in March 2025" photo; if it is a Commons file under
  CC BY / CC BY-SA, it is the best candidate for the About hero and must be checked on its Commons page first.
- Official logo: no press kit or SMTOWN asset page found by search.
- Unsplash: no suitable images. Stock photos of other people or stages would misrepresent the group, and
  `CLAUDE.md` forbids invented images.

## Next steps

1. With Commons reachable, search `File:` pages for "Hearts2Hearts" and record title, author, licence and URL.
2. If a CC BY / CC BY-SA group photo exists, add it as a `media` row (hotlinked from `upload.wikimedia.org`) with
   attribution in `media.credit`, and let the About hero read it from the CMS instead of the hard-coded chip.
3. Import events (`docs/data-sources.md`, "Found but not imported") before wiring `poster_id` into `EventDrawer`.
