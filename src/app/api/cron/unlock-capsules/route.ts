import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { authorsToNotify, purgeOldPresence } from "@/lib/db/fan-capsule-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MINUTES = 60;

/**
 * Hourly (schedule "0 * * * *", UTC; registered in vercel.json by the lead in phase 9).
 *  1. Finds the authors whose letters reached open_at in the last hour.
 *     There is no notification channel in this repo yet: the query is ready (authorsToNotify) and the route reports the
 *     count, but nothing is sent. Once a channel exists, send from the `authors` list below.
 *  2. At 00:00 UTC it also deletes live_presence rows older than a day.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const authors = await authorsToNotify(WINDOW_MINUTES);
    const midnight = new Date().getUTCHours() === 0;
    const presencePurged = midnight ? await purgeOldPresence() : null;
    return NextResponse.json({
      windowMinutes: WINDOW_MINUTES,
      authors: authors.length,
      letters: authors.reduce((n, a) => n + a.letters, 0),
      notified: 0, // no notification channel yet
      presencePurged,
    });
  } catch (e) {
    console.error("unlock-capsules failed", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
