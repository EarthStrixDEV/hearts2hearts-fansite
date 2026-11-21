import type { EventRow, EventType } from "@/lib/db/types";

/**
 * Event days are KST calendar days so server and client group events identically. An event stored at exactly
 * 00:00 KST has no announced time ("time TBA"): the UI shows the date only and exports an all-day calendar entry.
 */
const KST_MS = 9 * 3600 * 1000;
const DAY_MS = 86400 * 1000;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const pad = (n: number) => String(n).padStart(2, "0");

export const TYPE_LABEL: Record<EventType, string> = {
  concert: "Concert",
  fanmeet: "Fan Meeting",
  broadcast: "Music Show",
  release: "Release",
  other: "Other",
};

/** KST calendar parts of an instant. `m` is 0-based. */
export function dayParts(ms: number) {
  const d = new Date(ms + KST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
}
export const dayKey = (ms: number) => {
  const p = dayParts(ms);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
};
export const monthKey = (ms: number) => dayKey(ms).slice(0, 7);

export const isTimeTba = (e: Pick<EventRow, "starts_at">) => (Date.parse(e.starts_at) + KST_MS) % DAY_MS === 0;

export type StatusLabel = "Upcoming" | "Past" | "Cancelled";
export function statusOf(e: EventRow, now: number): StatusLabel {
  if (e.is_cancelled) return "Cancelled";
  const start = Date.parse(e.starts_at);
  const upcoming = isTimeTba(e) ? dayKey(start) >= dayKey(now) : Date.parse(e.ends_at ?? e.starts_at) >= now;
  return upcoming ? "Upcoming" : "Past";
}

export const STATUS_STYLE: Record<StatusLabel, { bg: string; fg: string; dateBg: string; opacity: number; poster: string }> = {
  Upcoming: { bg: "#FFE3F1", fg: "#9E1D50", dateBg: "#FFB6D5", opacity: 1, poster: "linear-gradient(135deg,#FFB6D5,#C9B6FF)" },
  Past: { bg: "rgba(43,36,64,.08)", fg: "#6E6787", dateBg: "#E6DCFF", opacity: 0.75, poster: "linear-gradient(135deg,#E6DCFF,#DDF0FF)" },
  Cancelled: { bg: "rgba(43,36,64,.08)", fg: "#6E6787", dateBg: "#E6DCFF", opacity: 0.6, poster: "linear-gradient(135deg,#E6DCFF,#DDF0FF)" },
};

export function longDate(ms: number) {
  const p = dayParts(ms);
  return `${WD[p.wd]}, ${MONTHS[p.m]} ${p.d}, ${p.y}`;
}

export const whereOf = (e: Pick<EventRow, "city" | "venue">) =>
  [e.city ?? "City TBA", e.venue ?? "Venue TBA"].join(" · ");

/** Minimal RFC 5545 file for one event. Date-only events become all-day; timed ones use `ends_at`, else a 2-hour slot. */
export function buildIcs(e: EventRow): string {
  const start = Date.parse(e.starts_at);
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ymd = (ms: number) => dayKey(ms).replace(/-/g, "");
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/[,;]/g, "\\$&").replace(/\n/g, "\\n");
  const when = isTimeTba(e)
    ? [`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(start + DAY_MS)}`]
    : [`DTSTART:${stamp(start)}`, `DTEND:${stamp(e.ends_at ? Date.parse(e.ends_at) : start + 2 * 3600 * 1000)}`];
  const place = [e.venue, e.city].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//H2H-S2U//Schedule//EN", "BEGIN:VEVENT",
    `UID:${e.id}@h2h-s2u`, `DTSTAMP:${stamp(Date.now())}`, ...when,
    `SUMMARY:${esc(e.title)}`, ...(place ? [`LOCATION:${esc(place)}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
