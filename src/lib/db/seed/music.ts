// Seed = arrays transcribed from design/project/Music.dc.html. Used when no database is configured.
import type { MusicBoardData } from "../music";

/** Placeholder gradients from the design (no real covers exist). */
export const G = {
  iconic: "linear-gradient(135deg,#FFE3F1,#FF8FB8 60%,#C9B6FF)",
  lemon: "linear-gradient(135deg,#FFF6C9,#FFE08A 45%,#CFF3DD)",
  rude: "linear-gradient(135deg,#FFE0EC,#FF9EC3 50%,#FFD8B8)",
  rudejp: "linear-gradient(135deg,#FFE0EC,#FFB6D5 50%,#DDF0FF)",
  moon: "linear-gradient(135deg,#2B2440,#6B5A9E 55%,#A8D8FF)",
  focus: "linear-gradient(135deg,#E9E1FF,#C9B6FF 50%,#BFE2FF)",
  pretty: "linear-gradient(135deg,#FFE3F1,#F9B8DD 50%,#E9E1FF)",
  style: "linear-gradient(135deg,#DDF0FF,#A8D8FF 50%,#FFE3F1)",
  chase: "linear-gradient(135deg,#FFD6E7,#FFB6D5 45%,#E9D9FF)",
} as const;

const t = (title: string, album: string, grad: string) => ({ title, album, grad, spotify_url: null, youtube_url: null });
const r = (slug: string, title: string, kind: string, tab: MusicBoardData["releases"][number]["tab"], release_date: string, grad: string, track_label: string) =>
  ({ slug, title, kind, tab, release_date, grad, track_label, spotify_url: null });

export const SEED_MUSIC: MusicBoardData = {
  releases: [
    r("iconic-heart", "Iconic Heart", "Japanese single", "singles", "2026-08-12", G.iconic, "tracks TODO"),
    r("lemon-tang", "Lemon Tang", "2nd mini album", "albums", "2026-06-22", G.lemon, "tracks TODO"),
    r("rude-japanese-ver", "Rude! (Japanese ver.)", "Japanese digital single", "singles", "2026-03-27", G.rudejp, "1 track"),
    r("rude", "Rude!", "Digital single", "singles", "2026-02-20", G.rude, "1 track"),
    r("moonride", "Moonride", "Promotional single", "special", "2026", G.moon, "1 track"),
    r("focus", "Focus", "1st mini album", "albums", "2025-10-20", G.focus, "tracks TODO"),
    r("pretty-please", "Pretty Please", "Pre-release single", "singles", "2025-09-24", G.pretty, "1 track"),
    r("style", "Style", "Digital single", "singles", "2025-06-18", G.style, "1 track"),
    r("the-chase", "The Chase", "Single album", "singles", "2025-02-24", G.chase, "2 tracks"),
  ],
  tracks: [
    t("Lemon Tang", "Lemon Tang", G.lemon),
    t("Focus", "Focus", G.focus),
    t("The Chase", "The Chase", G.chase),
    t("Rude!", "Lemon Tang", G.rude),
    t("Style", "Style", G.style),
    t("Pretty Please", "Focus", G.pretty),
    t("Iconic Heart", "Iconic Heart", G.iconic),
    t("Butterflies", "The Chase", G.chase),
  ],
  videos: [
    { title: "Iconic Heart", date: "Aug 2026", grad: G.iconic, youtube_url: null },
    { title: "Lemon Tang", date: "Jun 2026", grad: G.lemon, youtube_url: null },
    { title: "Rude!", date: "Feb 2026", grad: G.rude, youtube_url: null },
    { title: "Focus", date: "Oct 2025", grad: G.focus, youtube_url: null },
    { title: "Style", date: "Jun 2025", grad: G.style, youtube_url: null },
    { title: "The Chase", date: "Feb 2025", grad: G.chase, youtube_url: null },
  ],
  eras: [
    { title: "The Chase", date: "Feb 2025", grad: G.chase, dot: "#FF8FB8" },
    { title: "Style", date: "Jun 2025", grad: G.style, dot: "#7EC4FF" },
    { title: "Focus", date: "Oct 2025", grad: G.focus, dot: "#B9A3F5" },
    { title: "Rude!", date: "Feb 2026", grad: G.rude, dot: "#FF9EC3" },
    { title: "Lemon Tang", date: "Jun 2026", grad: G.lemon, dot: "#FFD25E" },
    { title: "Iconic Heart", date: "Aug 2026", grad: G.iconic, dot: "#FF8FB8" },
  ],
};
