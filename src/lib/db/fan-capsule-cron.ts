import "server-only";
import { query } from "@/lib/neon/db";

// Owner-client queries for the capsule cron (bypasses RLS: only /api/cron/unlock-capsules may import this file).

/**
 * Authors with a letter whose open_at passed within the last `windowMinutes` (default: the hourly cron's window), one row
 * per author. These are the users to tell that a letter just opened.
 */
export async function authorsToNotify(windowMinutes = 60): Promise<{ userId: string; letters: number }[]> {
  const rows = await query<{ user_id: string; letters: number }>(
    `select user_id, count(*)::int as letters
       from capsule_letters
      where open_at <= now() and open_at > now() - make_interval(mins => $1::int)
      group by user_id order by user_id`,
    [windowMinutes],
  );
  return rows.map((r) => ({ userId: r.user_id, letters: r.letters }));
}

/**
 * Presence rows are heartbeats of the live waiting room: anything older than a day is dead weight. Returns rows removed.
 * `roomId` limits the delete to one room (the cron passes nothing; tests pass their own room).
 */
export async function purgeOldPresence(roomId: string | null = null): Promise<number> {
  const rows = await query<{ n: number }>(
    `with gone as (
       delete from live_presence where seen_at < now() - interval '1 day' and ($1::uuid is null or room_id = $1::uuid) returning 1
     ) select count(*)::int as n from gone`,
    [roomId],
  );
  return rows[0]?.n ?? 0;
}
