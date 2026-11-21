import type { AboutContent } from "../pages";

// Transcribed from design/project/About.dc.html. Bracketed/TODO copy is kept as the design has it (unverified facts are not invented).
const I = {
  cam: "M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16.5 7.5h.01",
  chat: "M5 6h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  play: "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9v6l5-3z",
  note: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  head: "M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2zM20 15a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.7",
};

export const SEED_ABOUT: AboutContent = {
  title: "Hearts2Hearts",
  nameStory: "[NAME STORY · one line on what “Hearts2Hearts” means, quoted from SM’s official introduction]",
  info: [
    { key: "debut", label: "Debut", value: "Feb 24, 2025", sub: "Single album The Chase" },
    { key: "agency", label: "Agency", value: "SM Entertainment" },
    { key: "members", label: "Members", value: "8", sub: "Jiwoo, Carmen, Yuha, Stella, Juun, A-na, Ian, Ye-on" },
    { key: "fandom", label: "Fandom", value: "S2U (하츄)" },
    { key: "colors", label: "Official colors", value: "TODO", sub: "Add from an official SM source", muted: true },
  ],
  story: [
    { when: "TODO", title: "Formation", body: "[How the group was formed · from an official SM source]", dot: "#C9B6FF" },
    { when: "Feb 24, 2025", title: "Debut with The Chase", body: "The single album came out with the showcase “Chase Our Hearts” at Yes24 Live Hall in Seoul.", dot: "#FF8FB8" },
    { when: "May 2025", title: "SMTOWN LIVE 2025–26", body: "Joined SM’s family concert tour, starting with Mexico City and Los Angeles.", dot: "#A8D8FF" },
    { when: "Jun 18, 2025", title: "“Style”", body: "A digital single between eras.", dot: "#A8D8FF" },
    { when: "Oct 20, 2025", title: "First EP, Focus", body: "Preceded by the pre-release single “Pretty Please” on September 24.", dot: "#C9B6FF" },
    { when: "Feb 21, 2026", title: "Hearts2House 2026 begins", body: "The first own tour opened with two nights at Olympic Hall in Seoul.", dot: "#FF8FB8" },
    { when: "Mar 2026", title: "Tour goes overseas", body: "Brooklyn Paramount, The Wiltern in Los Angeles, and Tennis Indoor Senayan in Jakarta.", dot: "#FF8FB8" },
    { when: "Jun 22, 2026", title: "Second EP, Lemon Tang", body: "Includes the earlier single “Rude!”.", dot: "#FFD25E" },
    { when: "Aug 12, 2026", title: "Japanese single “Iconic Heart”", body: "A non-album release for Japan.", dot: "#FF8FB8" },
  ],
  links: [
    { name: "Instagram", handle: "@hearts2hearts", href: "https://www.instagram.com/hearts2hearts", icon: I.cam, bg: "#FFE3F1" },
    { name: "X", handle: "@Hearts2Hearts", href: "https://x.com/Hearts2Hearts", icon: I.chat, bg: "#E6DCFF" },
    { name: "YouTube", handle: "@hearts2hearts.official", href: "https://www.youtube.com/@hearts2hearts.official", icon: I.play, bg: "#FFE0E6" },
    { name: "TikTok", handle: "@hearts2hearts", href: "https://www.tiktok.com/@hearts2hearts", icon: I.note, bg: "#DDF0FF" },
    { name: "Spotify", handle: "Artist link TODO", href: "https://open.spotify.com/search/Hearts2Hearts", icon: I.head, bg: "#CFF3DD" },
    { name: "Weverse", handle: "Community link TODO", href: "#", icon: I.people, bg: "#FFF1D6" },
  ],
  siteParagraphs: [
    "H2H·S2U is an unofficial fan project made by S2U, for S2U. It collects verified information in one soft, friendly place. Nothing here is official, and the AI blog is always labeled as fan content.",
    "Credits: [FAN TEAM NAMES] · Contact: [CONTACT EMAIL]",
  ],
  builtWith: [
    { label: "Next.js App Router", bg: "#FFE3F1" },
    { label: "TypeScript", bg: "#E6DCFF" },
    { label: "Tailwind CSS", bg: "#DDF0FF" },
    { label: "Framer Motion", bg: "#FFF1D6" },
    { label: "React Three Fiber + drei", bg: "#CFF3DD" },
    { label: "Neon Postgres", bg: "#FFE3F1" },
  ],
  disclaimer:
    "This is an unofficial fan site, not affiliated with SM Entertainment or Hearts2Hearts. All images, music and related rights belong to SM Entertainment and their respective owners.",
};
