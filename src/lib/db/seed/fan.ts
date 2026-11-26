// Fallback for /fan when no database is configured (same values as scripts/seed-fan.mjs, design/FanHome artboard).
import type { FandomSetting } from "../fan-types";

export const SEED_FANDOM: FandomSetting = { name: "S2U", name_native: "하츄", color: "#A8D8FF", debut_date: "2025-02-24" };

/** Era colors by album title (lower case). Also the fallback palette for albums the CMS has not themed yet. */
export const SEED_ERA_COLORS: [from: string, to: string][] = [
  ["#DDF0FF", "#A8D8FF"],
  ["#FFE3F1", "#FFB6D5"],
  ["#E9E1FF", "#C9B6FF"],
  ["#FFD6DE", "#FF8FB8"],
  ["#FFF6C9", "#FFE08A"],
  ["#FFE3F1", "#C9B6FF"],
];

export const SEED_ERAS = [
  { id: "seed-the-chase", title: "The Chase", albumType: "single", releaseDate: "2025-02-24" },
  { id: "seed-style", title: "Style", albumType: "single", releaseDate: "2025-06-18" },
  { id: "seed-focus", title: "Focus", albumType: "ep", releaseDate: "2025-10-20" },
  { id: "seed-rude", title: "Rude!", albumType: "single", releaseDate: "2026-02-20" },
  { id: "seed-lemon-tang", title: "Lemon Tang", albumType: "ep", releaseDate: "2026-06-22" },
  { id: "seed-iconic-heart", title: "Iconic Heart", albumType: "single", releaseDate: "2026-08-12" },
] as const;

/** 2nd anniversary: Feb 24, 2027 00:00 KST. */
export const SEED_COUNTDOWN = {
  id: "seed-anniversary",
  title: "2nd anniversary with S2U",
  kind: "anniversary" as const,
  targetAt: "2027-02-23T15:00:00.000Z",
  teasers: [] as { label: string; unlockAt: string | null }[],
};
