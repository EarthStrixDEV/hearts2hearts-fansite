import type { ContentStatus } from "@/lib/db/types";
import type { ActionState } from "./types";

export const ok = (message: string, redirect?: string): ActionState => ({ ok: true, message, redirect, at: Date.now() });
export const fail = (message: string): ActionState => ({ ok: false, message, at: Date.now() });

export const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const orNull = (fd: FormData, k: string): string | null => str(fd, k) || null;
export const num = (fd: FormData, k: string, d = 0): number => {
  const s = str(fd, k);
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? Math.trunc(n) : d;
};
export const flag = (fd: FormData, k: string): boolean => fd.get(k) === "on" || fd.get(k) === "true";
export const csv = (fd: FormData, k: string): string[] => str(fd, k).split(",").map((s) => s.trim()).filter(Boolean);

/** Save-draft / Publish / Archive buttons post `intent`. */
export const statusOf = (fd: FormData): ContentStatus => {
  const i = str(fd, "intent");
  return i === "publish" ? "published" : i === "archive" ? "archived" : "draft";
};

export const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export const fallbackSlug = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

/** Friendly message for a thrown Postgres error. */
export function dbError(e: unknown): string {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  if (code === "23505") return "That slug is already used by another entry.";
  if (code === "23503") return "This is still referenced elsewhere. Remove it there first.";
  if (code === "22P02") return "One of the values has an invalid format.";
  return e instanceof Error ? e.message : "Something went wrong.";
}

/** "m:ss" or plain seconds → seconds. Empty → null. */
export function parseDuration(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{1,3}):([0-5]?\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return /^\d+$/.test(t) ? Number(t) : null;
}
export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// ---- timezones (events store UTC; editors type venue-local time) ----
function offsetMin(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const p: Record<string, number> = {};
  for (const x of parts) if (x.type !== "literal") p[x.type] = Number(x.value);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utcMs) / 60000;
}
/** "YYYY-MM-DDTHH:mm" in `tz` → UTC ISO string. */
export function zonedToUtcISO(local: string, tz: string): string {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, da, h, mi);
  let utc = guess - offsetMin(guess, tz) * 60000;
  utc = guess - offsetMin(utc, tz) * 60000;
  return new Date(utc).toISOString();
}
/** UTC ISO → "YYYY-MM-DDTHH:mm" in `tz` (for <input type=datetime-local>). */
export function utcToZonedLocal(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + offsetMin(ms, tz) * 60000).toISOString().slice(0, 16);
}
export const validTz = (tz: string) => {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
};
export const PUBLISH_TZ = "Asia/Bangkok"; // AI daily post + publish-at inputs (design: 09:00 Asia/Bangkok)

export function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: iso.length === 10 ? "UTC" : PUBLISH_TZ, ...opts });
}
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: PUBLISH_TZ });
}
