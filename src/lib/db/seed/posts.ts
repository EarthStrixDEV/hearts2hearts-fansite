// Seed = POSTS/TAGS from design/project/Blog.dc.html (the design has no article bodies; bodies here are
// short sample texts that only restate dates/venues already present in the other seed files).
import type { PostDetail } from "../posts";

export const TAG = {
  trivia: { slug: "trivia", name: "Trivia" },
  song: { slug: "song-analysis", name: "Song Analysis" },
  era: { slug: "era-recap", name: "Era Recap" },
  fun: { slug: "fun", name: "Fun" },
} as const;

const p = (
  slug: string,
  published_at: string,
  tag: (typeof TAG)[keyof typeof TAG],
  read_min: number,
  title: string,
  excerpt: string,
  grad: string,
  body_md: string,
): PostDetail => ({ slug, title, excerpt, body_md, tags: [tag], published_at, source: "ai", read_min, grad });

export const SEED_POSTS: PostDetail[] = [
  p(
    "era-recap-the-chase-to-lemon-tang", "2026-10-18T09:00:00+09:00", TAG.era, 5,
    "Era recap: from The Chase to Lemon Tang",
    "A single album, two mini albums and a run of digital and Japanese singles in about eighteen months. The whole timeline in one place, release by release.",
    "linear-gradient(135deg,#FFF6C9,#FFB6D5 60%,#C9B6FF)",
    `A quick walk through every official release so far, oldest first.

## The first year

- **The Chase** · single album · February 24, 2025
- **Style** · digital single · June 18, 2025
- **Pretty Please** · pre-release single · September 24, 2025
- **Focus** · 1st mini album · October 20, 2025

## The second stretch

- **Rude!** · digital single · February 20, 2026
- **Rude! (Japanese ver.)** · March 27, 2026
- **Lemon Tang** · 2nd mini album · June 22, 2026
- **Iconic Heart** · Japanese single · August 12, 2026

## Why it reads as eras

Each release arrived with its own look and its own pink-to-lilac palette, which is why the [Music](/music) page lays them out as an era timeline.

> Fan-made summary. Dates come from the official announcements.`,
  ),
  p(
    "eight-audition-songs", "2026-10-17T09:00:00+09:00", TAG.trivia, 4,
    "Eight audition songs, eight starting points",
    "From Red Velvet’s “Peek-A-Boo” to Taeyeon’s “UR”: the songs the members auditioned with, gathered from published profiles.",
    "linear-gradient(135deg,#DDF0FF,#C9B6FF)",
    `Audition songs say a lot about where a trainee starts from.

## Two examples

- Red Velvet’s “Peek-A-Boo”
- Taeyeon’s “UR”

## Where to find the rest

The full list lives in each member’s published profile. Open the [Members](/members) page and look for the audition fact on every card.`,
  ),
  p(
    "hearts2house-2026-tour-stops", "2026-10-16T09:00:00+09:00", TAG.era, 3,
    "Hearts2House 2026: a look back at the tour stops",
    "Seoul, Brooklyn, Los Angeles and Jakarta. The group’s first tour ran from February to March 2026; here are the venues and dates.",
    "linear-gradient(135deg,#FFD6E7,#A8D8FF)",
    `The first tour ran from February to March 2026.

## Stops

- **Seoul** · Olympic Hall · February 21 and 22
- **Brooklyn, NY** · Brooklyn Paramount · March 19
- **Los Angeles** · The Wiltern · March 22
- **Jakarta** · Tennis Indoor Senayan · March 28

See every date on the [Schedule](/schedule) page.`,
  ),
  p(
    "pretty-please-listening-guide", "2026-10-15T09:00:00+09:00", TAG.song, 6,
    "Listening guide: “Pretty Please”, the pre-release",
    "Released on September 24, 2025, almost a month before the Focus EP. A guide to what to listen for, track structure first.",
    "linear-gradient(135deg,#FFE3F1,#F9B8DD 50%,#E9E1FF)",
    `“Pretty Please” came out on September 24, 2025, almost a month before the Focus mini album on October 20.

## How to listen

Play it once straight through, then again while following only one thing at a time: the opening, how each section hands over to the next, and the ending.

## Then compare

Put it next to the title track of Focus and note what carries over from one to the other.`,
  ),
  p(
    "every-city-2025-26", "2026-10-14T09:00:00+09:00", TAG.fun, 3,
    "Every city Hearts2Hearts performed in, 2025–26",
    "Mexico City, Los Angeles, London, Tokyo, Fukuoka, Bangkok, Seoul, Brooklyn and Jakarta, pinned on one map.",
    "linear-gradient(135deg,#CFF3DD,#A8D8FF)",
    `Nine cities in about a year, in the order they happened.

1. Mexico City · May 9, 2025
2. Los Angeles · May 11, 2025
3. London · June 28, 2025
4. Tokyo · August 9, 2025
5. Seoul · October 20, 2025
6. Fukuoka · January 31, 2026
7. Bangkok · February 14, 2026
8. Brooklyn, NY · March 19, 2026
9. Jakarta · March 28, 2026

Los Angeles appears twice: once in May 2025 and again on the Hearts2House tour in March 2026.`,
  ),
  p(
    "bali-busan-vancouver", "2026-10-13T09:00:00+09:00", TAG.trivia, 4,
    "Bali, Busan, Vancouver: places in the members’ stories",
    "Where the members grew up and trained, according to their published profiles.",
    "linear-gradient(135deg,#FFCBA4,#FFE3F1 60%,#A8D8FF)",
    `Hometowns and training cities show up all over the member profiles.

## Places mentioned

- Bali
- Busan
- Vancouver

Every member’s profile lists where they grew up. Start from the [Members](/members) page.`,
  ),
  p(
    "rude-in-two-languages", "2026-10-12T09:00:00+09:00", TAG.song, 5,
    "“Rude!” in two languages",
    "The digital single arrived on February 20, 2026, and a Japanese version followed on March 27. Comparing the two releases.",
    "linear-gradient(135deg,#FFE0EC,#FF9EC3 50%,#FFD8B8)",
    `## Two releases

- **Rude!** · digital single · February 20, 2026
- **Rude! (Japanese ver.)** · digital single · March 27, 2026

## What to compare

Listen to both back to back and compare the lyrics sung in each language and how the phrasing changes.`,
  ),
  p(
    "almost-a-year-of-focus", "2026-10-11T09:00:00+09:00", TAG.era, 4,
    "Almost a year of Focus",
    "The first mini album came out on October 20, 2025, with a showcase in Seoul the same day.",
    "linear-gradient(135deg,#E9E1FF,#C9B6FF 50%,#BFE2FF)",
    `## The release

**Focus**, the first mini album, came out on October 20, 2025.

## The showcase

The Focus showcase took place the same day in Seoul, at Blue Square SOL Travel Hall.`,
  ),
  p(
    "quiz-warm-up-five-facts", "2026-10-10T09:00:00+09:00", TAG.fun, 2,
    "Quiz warm-up: five facts before you play",
    "A quick primer for the Get to Know H2H quiz, built from the same verified profile facts.",
    "linear-gradient(135deg,#FFF6C9,#FFE08A 45%,#CFF3DD)",
    `Five facts to refresh before you open the [game](/game).

1. The debut showcase, “Chase Our Hearts”, was held at Yes24 Live Hall in Seoul on February 24, 2025.
2. The debut release was the single album **The Chase**.
3. The first mini album, **Focus**, came out on October 20, 2025.
4. The first tour, Hearts2House 2026, started in Seoul at Olympic Hall.
5. The 2nd mini album, **Lemon Tang**, came out on June 22, 2026.`,
  ),
];
