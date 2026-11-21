import type { MemberWithFacts } from "@/lib/db/members";
import { FACT } from "@/lib/db/seed/members";

// Pure helpers shared by the home, members and member-detail pages. Server-side use: client components only get the serialised results.

const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2006-09-07" or a full ISO timestamp → "Sep 7, 2006" / "September 7, 2006". Parses the string, so no timezone drift. */
export function fmtDate(iso: string, style: "short" | "long" = "short"): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${(style === "long" ? MON_LONG : MON_SHORT)[m - 1]} ${d}, ${y}`;
}

const ZODIAC: [number, string][] = [
  [120, "Capricorn"], [219, "Aquarius"], [321, "Pisces"], [420, "Aries"], [521, "Taurus"], [621, "Gemini"], [723, "Cancer"],
  [823, "Leo"], [923, "Virgo"], [1023, "Libra"], [1122, "Scorpio"], [1222, "Sagittarius"],
];
export function zodiac(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  const md = m * 100 + d;
  return ZODIAC.find(([end]) => md < end)?.[1] ?? "Capricorn";
}

// --- accent colour math: members only store color_hex; the dark/soft/tint variants are derived ---
const toRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const luminance = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrastOnWhite = (rgb: number[]) => 1.05 / (luminance(rgb) + 0.05);

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}

/** Same hue as the member colour, darkened until white text on it reaches 4.5:1 (buttons, headings on the accent theme). */
export function accentDeep(hex: string): string {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const s = Math.max(0.55, d ? d / (1 - Math.abs(max + min - 1)) : 0);
  let l = Math.min(0.45, (max + min) / 2);
  let rgb = hslToRgb(h, s, l);
  while (l > 0.1 && contrastOnWhite(rgb) < 4.5) rgb = hslToRgb(h, s, (l -= 0.01));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
export const accentSoft = (hex: string) => `${hex}66`;
export const accentTint = (hex: string) => `${hex}1A`;

/** Placeholder "photo" for a member: their colour fading into cream. */
export const memberGrad = (hex: string, angle = 165, stop = 130) => `linear-gradient(${angle}deg,${hex}, #FFF8F3 ${stop}%)`;

// --- member_facts accessors ---
export const factValues = (m: MemberWithFacts, label: string) => m.facts.filter((f) => f.label === label).map((f) => f.value);
export const factValue = (m: MemberWithFacts, label: string) => factValues(m, label)[0];

// --- position filter tags: derived from the free-text position list ---
export type PositionTag = "vocal" | "dance" | "rap" | "visual";
export const positionTags = (position: string[] | null): PositionTag[] => {
  const p = (position ?? []).join(" ").toLowerCase();
  return (["vocal", "dance", "rap", "visual"] as const).filter((t) => p.includes(t));
};

export type Rarity = "holo" | "rare" | "common";

/** Serialisable card data for the grid, photocards and home tilt cards. */
export interface MemberCardData {
  slug: string; name: string; ko: string; color: string;
  position: string; firstPosition: string; tags: PositionTag[];
  born: string; bornLabel: string; nationality: string; fact: string; rarity: Rarity;
}
export function toCardData(m: MemberWithFacts): MemberCardData {
  const rarity = factValue(m, FACT.rarity);
  return {
    slug: m.slug, name: m.stage_name, ko: m.name_ko ?? "", color: m.color_hex,
    position: (m.position ?? []).join(" · "), firstPosition: m.position?.[0] ?? "", tags: positionTags(m.position),
    born: m.birth_date ?? "", bornLabel: m.birth_date ? fmtDate(m.birth_date) : "",
    nationality: factValue(m, FACT.nationality) ?? "", fact: m.bio ?? "",
    rarity: rarity === "holo" || rarity === "rare" ? rarity : "common",
  };
}
