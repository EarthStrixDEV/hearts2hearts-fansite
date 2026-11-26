import { z } from "zod";
import { WrappedData } from "@/lib/fan/wrapped";
import { hasFanDb, withUser } from "./fan-client";
import type { FanActivityKind } from "./fan-types";

// Phase 7, user-facing side: the activity-log writer every phase calls, and the fan's own Wrapped snapshot.
// Reads and writes run as `fan_app` through withUser(), so RLS applies (a fan only ever sees their own snapshot).
// The yearly build is owner-only and lives in src/lib/fan/wrapped-build.ts (cron).

const Log = z.object({
  kind: z.enum(["stream_log", "mission", "card", "live_attend", "login"]),
  refId: z.guid().nullable().optional(),
  amount: z.number().int().min(1).max(600).optional(),
});

/**
 * The one way to record a countable action (login, mission, card, live_attend, stream_log): calls app.log_fan_activity(), which
 * enforces the daily / once-per-ref rules and unlocks room items. Safe to call twice for login / live_attend / card (idempotent).
 * Throws on invalid input; a database error carries the Postgres code (28000 not signed in, 42501 banned, H2H02 stream cap).
 * Phases 4 (card), 5 (live_attend) and 9 (login) call this; nothing else may insert into fan_activity.
 */
export async function logFanActivity(userId: string, input: { kind: FanActivityKind; refId?: string | null; amount?: number }): Promise<void> {
  const a = Log.parse(input);
  await withUser(userId, (q) => q("select app.log_fan_activity($1, $2, $3)", [a.kind, a.refId ?? null, a.amount ?? 1]));
}

/** The fan's Wrapped for `year`, or null when the cron has not built it (or the row does not parse). */
export async function getWrappedSnapshot(userId: string, year: number): Promise<WrappedData | null> {
  if (!hasFanDb()) return null;
  const rows = await withUser(userId, (q) =>
    q<{ data: unknown }>("select data from wrapped_snapshots where user_id = $1 and year = $2", [userId, year]),
  );
  if (!rows[0]) return null;
  const parsed = WrappedData.safeParse(rows[0].data);
  if (!parsed.success) {
    console.error("fan wrapped: snapshot does not match the expected shape", parsed.error.issues.slice(0, 3));
    return null;
  }
  return parsed.data;
}
