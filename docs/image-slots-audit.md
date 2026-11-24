# Image frames audit (2026-11-22)

Which image frames on the public site still show a placeholder, and what fills them.
Rule: a frame gets only a **genuine image of Hearts2Hearts** with a **clear free licence** (public domain,
CC BY, CC BY-SA). Images are hotlinked from `upload.wikimedia.org`. Nothing is copied into the repo. Attribution is
shown on the page next to the image. If no such image exists, the frame stays empty.

The URLs and licences live in `src/lib/db/seed/licensed-images.ts`.

## Filled in this change

| Frame (location) | Image | Source | Author | Licence | Attribution on page |
|---|---|---|---|---|---|
| About hero, "official group logo" (`src/app/(public)/about/page.tsx`): always shown | Official wordmark (SVG) | [File:Hearts2Hearts logotype.svg](https://commons.wikimedia.org/wiki/File:Hearts2Hearts_logotype.svg) | SM Entertainment | Public domain as a simple text logo (`{{PD-textlogo}}`). Commons also tags it `{{Trademarked}}`: still a trademark of SM Entertainment | Not required. A caption names the author, Commons and the trademark anyway |
| Home hero, centre "official group photo" card (`src/components/home/HomeSections.tsx`, `src/app/(public)/page.tsx`): shown only when no hero slide image exists (e.g. no database or no hero slides) | Group photo, all eight members, SBS Radio commute, 2025-03-05 (Wikipedia caption: "Hearts2Hearts in March 2025") | [File:250305 하츠투하츠 Hearts2Hearts SBS Radio Commute.jpg](https://commons.wikimedia.org/wiki/File:250305_%ED%95%98%EC%B8%A0%ED%88%AC%ED%95%98%EC%B8%A0_Hearts2Hearts_SBS_Radio_Commute.jpg) (still from the CC BY YouTube video "[4K] 하츠투하츠 'SBS 라디오 출근길'" by K-POPIT 케이팝잇) | 티비텐 (TV10) / K-POPIT 케이팝잇 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Yes, below the cards: author · licence link · Commons link |

The group photo is landscape (16:9), so it is drawn `object-fit: contain` in the 3:4 card. That keeps all eight
members in view instead of cropping to two or three.

## Already filled before this change (with the database imported)

Member avatars/covers/galleries, home side cards and era carousel, photocards, blog covers, album covers and disc
art. These are official YouTube stills hotlinked from `i.ytimg.com` (see `docs/data-sources.md`). They are
© SM Entertainment and **not** openly licensed. This change leaves them as they are.

## Still empty

| Frame (location) | Why |
|---|---|
| Event poster in the schedule drawer (`src/components/schedule/EventDrawer.tsx`) | No events are imported and `events.poster_id` is not rendered. Real posters are © SM, and Commons has none |
| Album cover, *ScreaM Rookies : The Chase (Remixes)* | No freely licensed cover exists (album art is © SM) |

## Other freely licensed Hearts2Hearts files on Commons (not used yet)

These are candidates for the member frames. Those frames are filled from the database, so they are not empty on the
live site. They are only empty in seed mode (no database).

| File | Licence | Author |
|---|---|---|
| [260221 HEARTS2HEARTS @ 2026 Fanmeeting HEARTS2HOUSE.jpg](https://commons.wikimedia.org/wiki/File:260221_HEARTS2HEARTS_@_2026_Fanmeeting_HEARTS2HOUSE.jpg) (group, current Wikipedia infobox photo) | CC BY-SA 4.0 | sublimitas viii (via Flickr) |
| [20260221 HEARTS2HEARTS @ 2026 Fanmeeting HEARTS2HOUSE.jpg](https://commons.wikimedia.org/wiki/File:20260221_HEARTS2HEARTS_@_2026_Fanmeeting_HEARTS2HOUSE.jpg) (group) | CC BY-SA 4.0 | sublimitas viii |
| [Hearts2Hearts 250515.jpg](https://commons.wikimedia.org/wiki/File:Hearts2Hearts_250515.jpg) (group) | CC BY 3.0 | K-POPIT 케이팝잇 |
| `<Member> di Musinsa Beauty Festa Pop-Up Store 2025.jpg` (Stella, Ian, Yuha, Juun, Ye-on, …) | CC BY 3.0 | K-POPIT 케이팝잇 TV10 |
| `20260827 HEARTS2HEARTS <Member> @ K-World Dream Awards.jpg` (Jiwoo, Juun, Yuha, Ian) | CC BY-SA 4.0 | sublimitas viii |
| [A-Na of Hearts2Hearts, March 29, 2025.jpg](https://commons.wikimedia.org/wiki/File:A-Na_of_Hearts2Hearts,_March_29,_2025.jpg) | CC BY 3.0 | 티비텐 |
| [20250926 Hearts2Hearts Jiwoo지우 (cropped).png](https://commons.wikimedia.org/wiki/File:20250926_Hearts2Hearts_Jiwoo%EC%A7%80%EC%9A%B0_(cropped).png) | CC BY 4.0 | Marie Claire Korea |

How they were found: the Commons file search API for "Hearts2Hearts", plus the images on the English Wikipedia
article. Licence, author and source were read from each file's `extmetadata` on 2026-11-22.

Caveat: Commons licences are the uploader's claim. The CC BY YouTube-derived files depend on the source video
being published under CC BY. Re-check the file page before reuse, and keep the attribution if a file is moved into
the CMS (`media.credit`).
