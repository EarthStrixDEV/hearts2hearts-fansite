import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hasDb } from "@/lib/neon/db";

/**
 * Quiz round state, carried by the client as an HMAC-signed token (no table needed).
 * The server picks the questions, grades every answer and only then signs the next token, so the leaderboard score
 * comes from `c` (server-graded correct count), never from a number the browser made up.
 * Limit: a token is not single-use, so a bot can still probe answers (the quiz reveals them by design); this stops
 * forging a score without playing the flow and keeps answers out of the page source.
 */
export interface Round {
  /** Fan the round was started for (null = guest, cannot post a score). */
  u: string | null;
  /** Question ids picked for this round, in play order. */
  q: string[];
  /** Questions answered so far. */
  i: number;
  /** Correct answers so far. */
  c: number;
  /** Round start, epoch ms. */
  t: number;
}

const TTL_MS = 30 * 60 * 1000;

function key(): string | null {
  const s = process.env.NEON_AUTH_COOKIE_SECRET;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : "dev-only-game-round-key"; // never signed with a guessable key in production
}
const mac = (k: string, body: string) => createHmac("sha256", k).update(`game-round:v1:${body}`).digest("base64url");

export function signRound(r: Round): string | null {
  const k = key();
  if (!k) return null;
  const body = Buffer.from(JSON.stringify(r)).toString("base64url");
  return `${body}.${mac(k, body)}`;
}

/** Verified, unexpired round from a client token, or null. */
export function readRound(token: unknown): Round | null {
  if (typeof token !== "string" || token.length > 4000) return null;
  const k = key();
  if (!k) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const want = Buffer.from(mac(k, parts[0]));
  const given = Buffer.from(parts[1]);
  if (want.length !== given.length || !timingSafeEqual(want, given)) return null;
  try {
    const r = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as Round;
    const ok =
      (r.u === null || typeof r.u === "string") &&
      Array.isArray(r.q) && r.q.every((x) => typeof x === "string") &&
      Number.isInteger(r.i) && r.i >= 0 && r.i <= r.q.length &&
      Number.isInteger(r.c) && r.c >= 0 && r.c <= r.i &&
      Number.isFinite(r.t) && Date.now() - r.t <= TTL_MS;
    return ok ? r : null;
  } catch {
    return null;
  }
}

/** Same-origin guard for browser POSTs (an absent Origin header, e.g. server-to-server, is let through). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Signed-in, non-banned fan id, or null (guest, no database, auth not configured). Auth is loaded lazily: it throws on missing env. */
export async function currentUserId(): Promise<string | null> {
  if (!hasDb() || !process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) return null;
  try {
    const { getCurrentUser } = await import("@/lib/auth/session");
    return (await getCurrentUser())?.id ?? null;
  } catch {
    return null;
  }
}

export function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
