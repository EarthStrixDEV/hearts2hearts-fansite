import "server-only";
import { FEED_PAGE, toneOf, type FeedMessage, type FeedResponse } from "@/lib/fan/live";
import { hasFanDb, withUser } from "./fan-client";
import { SEED_COUNTDOWN } from "./seed/fan";

// Comeback waiting room data (phase 5). Every call runs through withUser() on `fan_app`, so RLS applies:
// guests can read countdowns, rooms and counts but not chat; chat and cheers need a signed-in, unbanned user.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LiveRoomInfo { id: string; opensAt: string; closesAt: string; slowModeSec: number; cheers: number; online: number }
export interface LiveCountdown { id: string; title: string; kind: "comeback" | "anniversary" | "release"; targetAt: string }
export interface LiveView { countdown: LiveCountdown; room: LiveRoomInfo | null }

/** Why a write was refused, mapped from the SQLSTATE codes in migration 0010. */
export type LiveFailure = "slow_mode" | "closed" | "not_allowed" | "sign_in" | "not_found";
export class LiveError extends Error {
  constructor(readonly kind: LiveFailure, readonly slowModeSec?: number) {
    super(kind);
  }
}

function pgCode(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
}

/** H2H01 slow mode, H2H03 room closed, 28000 not signed in, 42501 RLS / banned, 23503 unknown room. Anything else is rethrown. */
export function toLiveError(e: unknown, slowModeSec?: number): never {
  switch (pgCode(e)) {
    case "H2H01": throw new LiveError("slow_mode", slowModeSec);
    case "H2H03": throw new LiveError("closed");
    case "28000": throw new LiveError("sign_in");
    case "42501": throw new LiveError("not_allowed");
    case "23503": throw new LiveError("not_found");
    default: throw e;
  }
}

interface RoomRow { id: string; opens_at: string; closes_at: string; slow_mode_sec: number; cheers: string | number; online: number }
const roomInfo = (r: RoomRow): LiveRoomInfo => ({
  id: r.id, opensAt: r.opens_at, closesAt: r.closes_at, slowModeSec: r.slow_mode_sec, cheers: Number(r.cheers), online: r.online,
});

/** A published countdown and its waiting room (null when no live_rooms row exists yet). Guests allowed. */
export async function getLiveView(countdownId: string): Promise<LiveView | null> {
  if (!hasFanDb()) return countdownId === SEED_COUNTDOWN.id ? { countdown: { ...SEED_COUNTDOWN }, room: null } : null;
  if (!UUID.test(countdownId)) return null;
  return withUser(null, async (q) => {
    const [c] = await q<{ id: string; title: string; kind: LiveCountdown["kind"]; target_at: string }>(
      "select id, title, kind, to_json(target_at) #>> '{}' as target_at from countdowns where id = $1 and status = 'published'",
      [countdownId],
    );
    if (!c) return null;
    const [r] = await q<RoomRow>(
      `select r.id, to_json(r.opens_at) #>> '{}' as opens_at, to_json(r.closes_at) #>> '{}' as closes_at, r.slow_mode_sec, r.cheers,
              app.online_count(r.id) as online
         from live_rooms r where r.countdown_id = $1`,
      [countdownId],
    );
    return { countdown: { id: c.id, title: c.title, kind: c.kind, targetAt: c.target_at }, room: r ? roomInfo(r) : null };
  });
}

/**
 * Presence upsert. Signed-in fans are keyed by user id, guests by the anonymous id from their localStorage.
 * Returns the online count (app.online_count, 45 s window) so the caller can answer in one round trip.
 */
export async function heartbeat(userId: string | null, roomId: string, anonId: string | null): Promise<number> {
  if (userId === null && anonId === null) throw new Error("heartbeat needs a user or an anon id");
  try {
    return await withUser(userId, async (q) => {
      if (userId !== null) {
        await q(
          `insert into live_presence (room_id, user_id) values ($1, $2)
           on conflict (room_id, user_id) where user_id is not null do update set seen_at = now()`,
          [roomId, userId],
        );
      } else {
        await q(
          `insert into live_presence (room_id, anon_id) values ($1, $2)
           on conflict (room_id, anon_id) where anon_id is not null do update set seen_at = now()`,
          [roomId, anonId],
        );
      }
      const [r] = await q<{ n: number }>("select app.online_count($1) as n", [roomId]);
      return r.n;
    });
  } catch (e) {
    return toLiveError(e);
  }
}

/**
 * One poll. `after` = last message id the client has (0 / null = the latest page). Guests get counts only (RLS hides chat).
 * Returns null when the room does not exist.
 */
export async function getFeed(userId: string | null, roomId: string, after: number | null): Promise<FeedResponse | null> {
  return withUser(userId, async (q) => {
    const [r] = await q<{ cheers: string | number; online: number }>(
      "select r.cheers, app.online_count(r.id) as online from live_rooms r where r.id = $1",
      [roomId],
    );
    if (!r) return null;
    let messages: FeedMessage[] = [];
    if (userId !== null) {
      const rows = await q<{ id: string; body: string; at: string; display_name: string | null; user_id: string }>(
        after
          ? `select m.id, m.body, to_json(m.created_at) #>> '{}' as at, p.display_name, m.user_id
               from live_messages m join profiles p on p.id = m.user_id
              where m.room_id = $1 and m.id > $2 order by m.id limit 100`
          : `select * from (
               select m.id, m.body, to_json(m.created_at) #>> '{}' as at, p.display_name, m.user_id
                 from live_messages m join profiles p on p.id = m.user_id
                where m.room_id = $1 order by m.id desc limit ${FEED_PAGE}
             ) t order by id`,
        after ? [roomId, after] : [roomId],
      );
      messages = rows.map((m) => ({
        id: Number(m.id),
        name: m.display_name?.trim() || "S2U fan",
        body: m.body,
        at: m.at,
        tone: toneOf(m.user_id),
      }));
    }
    return { serverNow: Date.now(), cheers: Number(r.cheers), online: r.online, canRead: userId !== null, messages };
  });
}

/** Posts a chat message. The slow-mode trigger and RLS (room open, not banned) decide; failures become LiveError. */
export async function postMessage(userId: string, roomId: string, body: string): Promise<FeedMessage> {
  let slow: number | undefined;
  try {
    return await withUser(userId, async (q) => {
      const [room] = await q<{ slow_mode_sec: number }>("select slow_mode_sec from live_rooms where id = $1", [roomId]);
      if (!room) throw new LiveError("not_found");
      slow = room.slow_mode_sec;
      const [m] = await q<{ id: string; at: string; display_name: string | null }>(
        `with ins as (
           insert into live_messages (room_id, user_id, body) values ($1, $2, $3)
           returning id, created_at, user_id
         )
         select ins.id, to_json(ins.created_at) #>> '{}' as at, p.display_name from ins join profiles p on p.id = ins.user_id`,
        [roomId, userId, body],
      );
      return { id: Number(m.id), name: m.display_name?.trim() || "S2U fan", body, at: m.at, tone: toneOf(userId) };
    });
  } catch (e) {
    if (e instanceof LiveError) throw e;
    return toLiveError(e, slow);
  }
}

/** Adds one cheer (app.cheer: signed in, unbanned, room open). Returns the new total. */
export async function cheer(userId: string, roomId: string): Promise<number> {
  try {
    return await withUser(userId, async (q) => {
      const [r] = await q<{ total: string }>("select app.cheer($1) as total", [roomId]);
      return Number(r.total);
    });
  } catch (e) {
    return toLiveError(e);
  }
}

/**
 * Logs "I was here" once the countdown reached zero (3 s grace for clock skew) while the room is open.
 * app.log_fan_activity is idempotent per user, countdown and Thai day. Returns false when it is too early / the room is closed.
 */
export async function logAttendance(userId: string, roomId: string): Promise<boolean> {
  try {
    return await withUser(userId, async (q) => {
      const [r] = await q<{ countdown_id: string; ok: boolean }>(
        `select r.countdown_id,
                (c.target_at <= now() + interval '3 seconds' and now() between r.opens_at and r.closes_at) as ok
           from live_rooms r join countdowns c on c.id = r.countdown_id where r.id = $1`,
        [roomId],
      );
      if (!r) throw new LiveError("not_found");
      if (!r.ok) return false;
      await q("select app.log_fan_activity('live_attend', $1, 1)", [r.countdown_id]);
      return true;
    });
  } catch (e) {
    if (e instanceof LiveError) throw e;
    return toLiveError(e);
  }
}
