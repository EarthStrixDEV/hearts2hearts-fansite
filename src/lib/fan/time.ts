// Time helpers for the fan club. Every instant is stored as timestamptz (UTC); the UI shows Korea (KST) and Thailand (ICT)
// through Intl with an explicit IANA zone, never a hard-coded offset. `en-US` is fixed so server and browser print the same text.

export const KST = "Asia/Seoul";
export const ICT = "Asia/Bangkok";

/** "Feb 24, 2027, 00:00" in `timeZone`. Year is left out when `withYear` is false. */
export function formatZoned(iso: string | Date, timeZone: string, withYear = true): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...(withYear ? { year: "numeric" } : {}),
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** "Feb 24, 2025" for a plain 'YYYY-MM-DD' date (no zone shifts: the date is read as UTC and printed as UTC). */
export function formatDay(ymd: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${ymd}T00:00:00Z`));
}

/** Today's calendar date in Thailand as 'YYYY-MM-DD'. */
export function todayIct(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ICT, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Day 1 is the join date itself. */
export function dayNumberSince(joinedYmd: string, now: number): number {
  const days = Math.round((Date.parse(`${todayIct(now)}T00:00:00Z`) - Date.parse(`${joinedYmd}T00:00:00Z`)) / 86_400_000);
  return Math.max(1, days + 1);
}

/** Splits a countdown's remaining time. Never negative. */
export function splitRemaining(targetMs: number, nowMs: number): { d: number; h: number; m: number; s: number; done: boolean } {
  const s = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return { d: Math.floor(s / 86_400), h: Math.floor((s % 86_400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: s === 0 };
}
