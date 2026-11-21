import type { HomeEvent, HomePost, HomeRelease, HomeSlide, HomeTrack } from "../home";

// Transcribed from the <script> arrays of design/project/Main.dc.html.
// Gradients stand in for photos: no real images exist (see CLAUDE.md).

/** Era gradients in release order. Placeholder palette for anything without an image. */
export const PLACEHOLDER_GRADS = [
  "linear-gradient(135deg,#FFD6E7,#FFB6D5 45%,#E9D9FF)",
  "linear-gradient(135deg,#DDF0FF,#A8D8FF 50%,#FFE3F1)",
  "linear-gradient(135deg,#E9E1FF,#C9B6FF 50%,#BFE2FF)",
  "linear-gradient(135deg,#FFE0EC,#FF9EC3 50%,#FFD8B8)",
  "linear-gradient(135deg,#FFF6C9,#FFE08A 45%,#CFF3DD)",
  "linear-gradient(135deg,#FFE3F1,#FF8FB8 60%,#C9B6FF)",
];

export const SEED_SLIDES: HomeSlide[] = [
  { name: "The Chase", subline: "Single album · Feb 24, 2025" },
  { name: "Style", subline: "Digital single · Jun 18, 2025" },
  { name: "Focus", subline: "1st mini album · Oct 20, 2025" },
  { name: "Rude!", subline: "Digital single · Feb 20, 2026" },
  { name: "Lemon Tang", subline: "2nd mini album · Jun 22, 2026" },
  { name: "Iconic Heart", subline: "Japanese single · Aug 12, 2026" },
].map((s, i) => ({ id: `seed-slide-${i}`, ...s, imageUrl: null, grad: PLACEHOLDER_GRADS[i] }));


export const SEED_RELEASE: HomeRelease = {
  title: "Iconic Heart",
  typeLabel: "Japanese single",
  releaseDate: "2026-08-12",
  spotifyUrl: "https://open.spotify.com/search/Hearts2Hearts",
  grad: "linear-gradient(135deg,#FFE3F1,#FF8FB8)",
};

export const SEED_TOP5: HomeTrack[] = [
  { title: "Lemon Tang", album: "Lemon Tang · 2026", grad: "linear-gradient(135deg,#FFF6C9,#FFE08A 50%,#CFF3DD)" },
  { title: "Focus", album: "Focus · 2025", grad: "linear-gradient(135deg,#E9E1FF,#C9B6FF 55%,#BFE2FF)" },
  { title: "The Chase", album: "The Chase · 2025", grad: "linear-gradient(135deg,#FFD6E7,#FFB6D5 50%,#E9D9FF)" },
  { title: "Style", album: "Style · 2025", grad: "linear-gradient(135deg,#DDF0FF,#A8D8FF)" },
  { title: "Rude!", album: "Lemon Tang · 2026", grad: "linear-gradient(135deg,#FFE0EC,#FF9EC3 50%,#FFD8B8)" },
];

export const SEED_POSTS: HomePost[] = [
  { href: "/blog", title: "Era recap: from The Chase to Lemon Tang", publishedAt: "2026-10-18", readMin: 5, isAi: true,
    excerpt: "A single album, two mini albums and a run of digital and Japanese singles in about eighteen months. The whole timeline in one place, release by release.",
    grad: "linear-gradient(135deg,#FFF6C9,#FFB6D5 60%,#C9B6FF)", tags: [{ label: "Era Recap", bg: "#FFE3F1" }] },
  { href: "/blog", title: "Eight audition songs, eight starting points", publishedAt: "2026-10-17", readMin: 4, isAi: true,
    excerpt: "From Red Velvet’s “Peek-A-Boo” to Taeyeon’s “UR”: the songs the members auditioned with, gathered from published profiles.",
    grad: "linear-gradient(135deg,#DDF0FF,#C9B6FF)", tags: [{ label: "Trivia", bg: "#DDF0FF" }] },
  { href: "/blog", title: "Hearts2House 2026: a look back at the tour stops", publishedAt: "2026-10-16", readMin: 3, isAi: true,
    excerpt: "Seoul, Brooklyn, Los Angeles and Jakarta. The group’s first tour ran from February to March 2026; here are the venues and dates.",
    grad: "linear-gradient(135deg,#FFD6E7,#A8D8FF)", tags: [{ label: "Fun", bg: "#FFF1D6" }] },
];

// The design still shows bracketed placeholders for the next event; kept as-is (no invented events).
export const SEED_NEXT_EVENT: HomeEvent = {
  title: "[NEXT OFFICIAL EVENT]",
  place: "[CITY] · [VENUE]",
  startsAt: "2026-12-20T18:00:00+09:00",
};
