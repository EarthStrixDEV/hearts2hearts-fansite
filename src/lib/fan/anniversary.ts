// Time-capsule dates. A letter opens at 00:00 KST on the next debut anniversary (site_settings.fandom.debut_date).
// Every instant is a UTC `Date`; the Korean midnight is found through Intl, never with a hard-coded offset.
import { KST } from "./time";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

interface Ymd { y: number; m: number; d: number }

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function parseYmd(ymd: string): Ymd {
  const hit = YMD.exec(ymd);
  if (!hit) throw new Error(`debut date must be YYYY-MM-DD, got "${ymd}"`);
  const [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) throw new Error(`debut date is not a real date: "${ymd}"`);
  return { y, m, d };
}

/** Calendar parts of an instant as seen in `timeZone`. */
function partsIn(ms: number, timeZone: string): { y: number; m: number; d: number; h: number; mi: number; s: number } {
  const get = new Map<string, number>();
  for (const p of new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(ms)) {
    if (p.type !== "literal") get.set(p.type, Number(p.value));
  }
  return { y: get.get("year")!, m: get.get("month")!, d: get.get("day")!, h: get.get("hour")!, mi: get.get("minute")!, s: get.get("second")! };
}

/** Local time minus UTC, in ms, at the instant `ms`. */
function offsetMs(ms: number, timeZone: string): number {
  const p = partsIn(ms, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/** The UTC instant at which the wall clock in `timeZone` reads 00:00 on y-m-d. */
function zonedMidnight(y: number, m: number, d: number, timeZone: string): number {
  const guess = Date.UTC(y, m - 1, d);
  return guess - offsetMs(guess - offsetMs(guess, timeZone), timeZone);
}

export interface Anniversary {
  /** 00:00 KST on the anniversary day, as a UTC instant. */
  openAt: Date;
  /** 1 = first anniversary of the debut, 2 = second, ... */
  number: number;
}

/**
 * The next debut anniversary strictly after `now`, at 00:00 KST. On the anniversary itself the midnight has already passed
 * (and RLS only accepts open_at > now()), so a letter written that day opens on the next one. The debut day is not an
 * anniversary. A Feb 29 debut is celebrated on Feb 28 in years without one.
 */
export function nextAnniversary(debutYmd: string, now: number): Anniversary {
  const debut = parseYmd(debutYmd);
  for (let y = Math.max(debut.y + 1, partsIn(now, KST).y); ; y++) {
    const at = zonedMidnight(y, debut.m, Math.min(debut.d, daysInMonth(y, debut.m)), KST);
    if (at > now) return { openAt: new Date(at), number: y - debut.y };
  }
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
export function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** Whole days until `openAt`, rounded up. Never negative. */
export function daysUntil(openAt: Date | string, now: number): number {
  const at = typeof openAt === "string" ? Date.parse(openAt) : openAt.getTime();
  return Math.max(0, Math.ceil((at - now) / 86_400_000));
}

/** "Feb 24, 2027" for an instant, read in `timeZone`. */
export function formatDayZoned(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "short", day: "numeric" }).format(typeof iso === "string" ? new Date(iso) : iso);
}
