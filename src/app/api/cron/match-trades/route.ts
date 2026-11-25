import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { recordNewTradeMatches } from "@/lib/db/fan-binder";
import { hasDb } from "@/lib/neon/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Photocard "new match" sweep. Schedule: every 15 minutes (the lead registers it in vercel.json).
 * Finds every pair (A has X and wants Y, B has Y and wants X) that has no row in trade_match_notices yet and records it.
 * There is no notification channel in this repo, so `notified` is always 0: `recipients` is who a channel would message.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "database is not configured" }, { status: 500 });
  try {
    const { newMatches, users } = await recordNewTradeMatches();
    return NextResponse.json({ newMatches, users, notified: 0, note: "no notification channel is wired yet; matches are recorded only" });
  } catch (e) {
    console.error("match-trades failed", e);
    return NextResponse.json({ error: "match sweep failed" }, { status: 500 });
  }
}
