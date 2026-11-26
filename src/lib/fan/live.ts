// Pure helpers for the comeback waiting room (no I/O, safe for server and client, unit-tested in live.test.ts).

/** Presence heartbeat. Must stay well under ONLINE_WINDOW_SEC (app.online_count counts rows seen in the last 45 s). */
export const HEARTBEAT_MS = 20_000;
/** Mirrors the window hard-coded in app.online_count() (migration 0010). */
export const ONLINE_WINDOW_SEC = 45;
export const FEED_VISIBLE_MS = 2_000;
export const FEED_HIDDEN_MS = 10_000;
export const FEED_MAX_BACKOFF_MS = 30_000;
/** At or below this many seconds left every client floods the room with the fandom color. */
export const FLOOD_SEC = 10;
export const MAX_MESSAGE_LEN = 200;
export const CHEERS_PER_SEC = 5;
export const FEED_PAGE = 50;

const ANON_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const isAnonId = (v: unknown): v is string => typeof v === "string" && ANON_RE.test(v);

/** Delay before the next feed poll: 2 s while the tab is visible, 10 s hidden, doubled per consecutive failure (capped). */
export function pollDelayMs(visible: boolean, failures = 0): number {
  const base = visible ? FEED_VISIBLE_MS : FEED_HIDDEN_MS;
  return Math.min(FEED_MAX_BACKOFF_MS, base * 2 ** Math.min(Math.max(0, failures), 6));
}

export type RoomPhase = "before" | "open" | "closed";
/** Chat and cheers are gated by live_rooms.opens_at..closes_at (the DB enforces it too). */
export function roomPhase(nowMs: number, opensAt: string, closesAt: string): RoomPhase {
  if (nowMs < Date.parse(opensAt)) return "before";
  return nowMs <= Date.parse(closesAt) ? "open" : "closed";
}

/** Whole seconds until `targetMs`, never negative (ceil: the clock shows 00:01 until the very last moment). */
export function secondsLeft(targetMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
}

export const isFlood = (secLeft: number | null): boolean => secLeft !== null && secLeft <= FLOOD_SEC;

const p2 = (n: number) => String(n).padStart(2, "0");
/** "MM:SS" under one hour, "HH:MM:SS" under 100 hours, otherwise "Nd HH:MM:SS". */
export function formatClock(sec: number): { text: string; size: "lg" | "md" | "sm" } {
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86_400), h = Math.floor((s % 86_400) / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (s < 3600) return { text: `${p2(m)}:${p2(r)}`, size: "lg" };
  if (s < 100 * 3600) return { text: `${p2(Math.floor(s / 3600))}:${p2(m)}:${p2(r)}`, size: "md" };
  return { text: `${d}d ${p2(h)}:${p2(m)}:${p2(r)}`, size: "sm" };
}

/** Remaining slow-mode wait in ms (0 = can send). `lastSentAt` is on the server-synced clock. */
export function cooldownRemainingMs(lastSentAt: number | null, slowModeSec: number, nowMs: number): number {
  if (lastSentAt === null) return 0;
  return Math.max(0, lastSentAt + slowModeSec * 1000 - nowMs);
}

export interface OffsetSample { offset: number; rtt: number }
/**
 * Refines the server-clock offset (server time minus browser time) from a poll response: the offset is taken at the midpoint
 * of the request, and the sample with the smallest round trip wins (its error bound is rtt / 2).
 */
export function refineOffset(prev: OffsetSample | null, serverNow: number, sentAt: number, receivedAt: number): OffsetSample {
  const rtt = Math.max(0, receivedAt - sentAt);
  const next = { offset: serverNow - (sentAt + receivedAt) / 2, rtt };
  return prev === null || next.rtt <= prev.rtt ? next : prev;
}

/** Sliding-window limiter, in memory (per server instance, best effort): `limit` hits per `windowMs` per key. */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string, now: number): boolean {
      const fresh = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (fresh.length >= limit) {
        hits.set(key, fresh);
        return false;
      }
      fresh.push(now);
      hits.set(key, fresh);
      // keep the map small: drop idle keys now and then
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      return true;
    },
  };
}

const PALETTE = ["#A8D8FF", "#FFB3CF", "#C9B6FF", "#FFE08A", "#BFF0DA", "#F6B3E0"] as const;
/** Stable avatar color for a message author, from the id the server hashed (the id itself never leaves the server). */
export const toneColor = (tone: number): string => PALETTE[Math.abs(Math.trunc(tone)) % PALETTE.length];

/** Small stable hash of a user id into a palette index (server side). */
export function toneOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

export interface FeedMessage { id: number; name: string; body: string; at: string; tone: number }
export interface FeedResponse {
  /** server time in ms when the response was built */
  serverNow: number;
  cheers: number;
  online: number;
  /** false for guests: they only get counts */
  canRead: boolean;
  messages: FeedMessage[];
}

/** Merges new messages into the list by id (ascending), de-duplicating and keeping the newest `max`. */
export function mergeMessages(prev: FeedMessage[], incoming: FeedMessage[], max = 200): FeedMessage[] {
  if (incoming.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const add = incoming.filter((m) => !seen.has(m.id));
  if (add.length === 0) return prev;
  const all = [...prev, ...add].sort((a, b) => a.id - b.id);
  return all.length > max ? all.slice(all.length - max) : all;
}
