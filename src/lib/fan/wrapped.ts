import { z } from "zod";

// Fan Wrapped (artboard `Wrapped`): the snapshot shape and the pure functions that turn it into story slides.
// No server-only imports: the page, the client story component, the image renderer and the tests all use this file.
//
// Honest data only. The artboard shows "most played track" and "hours streamed", but nothing on this site records streams
// (the `stream_log` activity kind exists in the schema and has no UI), so those two cards are NOT built. What is real:
// activity rows (login / mission / card / live_attend), the fan's binder (fan_cards) and the bias they picked (fan_profiles).

export const WRAPPED_FIRST_YEAR = 2025;
/** A percentile among fewer fans than this is noise ("Top 100%" with one fan), so the rank slide is left out. */
export const MIN_FANS_FOR_RANK = 10;

const HEX = /^#[0-9a-f]{6}$/i;
const nat = z.number().int().min(0);

export const WrappedData = z.object({
  v: z.literal(1),
  year: z.number().int(),
  nickname: z.string(),
  /** actions counted for the year (activity rows except stream_log) */
  score: nat,
  /** 1 = most active; ties share a rank */
  rank: z.number().int().min(1),
  /** fans with at least one action that year */
  fans: z.number().int().min(1),
  activeDays: nat,
  logins: nat,
  missions: nat,
  liveAttended: nat,
  binder: z.object({ have: nat, want: nat, total: nat }),
  bias: z.object({ id: z.string(), name: z.string(), color: z.string().regex(HEX), have: nat }).nullable(),
  fandom: z.object({ fans: nat, actions: nat }),
  /** storage keys of the rendered 1080x1920 PNGs, one per slide; empty until the cron has rendered them */
  images: z.array(z.string()).default([]),
});
export type WrappedData = z.infer<typeof WrappedData>;

export interface WrappedSlide {
  id: "intro" | "days" | "rank" | "binder" | "bias";
  kicker: string;
  big: string;
  line: string;
  sub: string;
  /** CSS `background` value (gradient) */
  bg: string;
  ink: string;
}

/** Top X% for a 1-based rank among `fans`: rank 1 of 40 is Top 3%, never below 1%. */
export function topPercent(rank: number, fans: number): number {
  if (fans <= 0) return 100;
  return Math.min(100, Math.max(1, Math.ceil((100 * rank) / fans)));
}

export function binderPercent(b: { have: number; total: number }): number {
  return b.total > 0 ? Math.min(100, Math.round((100 * b.have) / b.total)) : 0;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The slides a fan actually earned, in artboard order. A slide with no data behind it is left out, never faked. */
export function buildSlides(d: WrappedData): WrappedSlide[] {
  const slides: WrappedSlide[] = [
    {
      id: "intro",
      kicker: `Your ${d.year}`,
      big: String(d.year),
      line: "What a year with Hearts2Hearts",
      sub: "Tap through your year as S2U.",
      bg: "linear-gradient(160deg,#FFB6D5,#C9B6FF 55%,#A8D8FF)",
      ink: "#2B2440",
    },
  ];

  if (d.activeDays > 0) {
    const parts = [
      d.logins > 0 ? plural(d.logins, "login") : null,
      d.missions > 0 ? plural(d.missions, "mission") : null,
      d.liveAttended > 0 ? plural(d.liveAttended, "live room") : null,
    ].filter((x): x is string => x !== null);
    slides.push({
      id: "days",
      kicker: "Time with the girls",
      big: String(d.activeDays),
      line: d.activeDays === 1 ? "day you showed up" : "days you showed up",
      sub: parts.length ? parts.join(" · ") : "Every visit counts.",
      bg: "linear-gradient(160deg,#D63A77,#8A5CE6)",
      ink: "#FFFFFF",
    });
  }

  if (d.fans >= MIN_FANS_FOR_RANK && d.score > 0) {
    slides.push({
      id: "rank",
      kicker: "Your rank",
      big: `Top ${topPercent(d.rank, d.fans)}%`,
      line: "Of S2U on this site",
      sub: "Based on logins, missions and live rooms you took part in.",
      bg: "linear-gradient(160deg,#2B2440,#3D84D4)",
      ink: "#FFFFFF",
    });
  }

  if (d.binder.total > 0 && d.binder.have + d.binder.want > 0) {
    slides.push({
      id: "binder",
      kicker: "Your binder",
      big: `${binderPercent(d.binder)}%`,
      line: `${plural(d.binder.have, "card")} collected`,
      sub: d.binder.want > 0 ? `${d.binder.want} still on your wish list.` : "Nothing left on your wish list.",
      bg: "linear-gradient(160deg,#FFF6C9,#FFE08A 55%,#CFF3DD)",
      ink: "#2B2440",
    });
  }

  if (d.bias) {
    slides.push({
      id: "bias",
      kicker: "Your bias",
      big: d.bias.name,
      line: d.bias.have > 0 ? `${plural(d.bias.have, "card")} in your binder` : `Your bias for ${d.year}`,
      sub: d.bias.have > 0 ? `${d.bias.name} was your bias for ${d.year}.` : "Collect their cards and they show up here next year.",
      bg: `linear-gradient(160deg,${d.bias.color},#FFF8F3)`,
      ink: "#2B2440",
    });
  }
  return slides;
}

/** Font size (artboard px, 360 wide) for the big number: a stage name is longer than "Top 3%". */
export function bigFontSize(big: string): number {
  return big.length <= 6 ? 76 : big.length <= 9 ? 52 : 36;
}

/** Route param to a year, or null when it is not a 4-digit year in [WRAPPED_FIRST_YEAR, currentYear]. */
export function parseYear(raw: string, currentYear: number): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const y = Number(raw);
  return y >= WRAPPED_FIRST_YEAR && y <= currentYear ? y : null;
}

/** Share text for the X intent, built only from what the fan's slides say. */
export function shareText(d: WrappedData): string {
  const rank = d.fans >= MIN_FANS_FOR_RANK && d.score > 0 ? ` I'm in the Top ${topPercent(d.rank, d.fans)}% of S2U.` : "";
  return `My S2U Wrapped ${d.year}: ${plural(d.activeDays, "day")} with Hearts2Hearts.${rank} #Hearts2Hearts #S2U`;
}
