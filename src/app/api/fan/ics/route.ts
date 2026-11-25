import { NextResponse } from "next/server";
import { z } from "zod";
import { getCountdownById } from "@/lib/db/fan";
import { buildIcs } from "@/lib/fan/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({ countdown: z.string().min(1).max(64) });

/** GET /api/fan/ics?countdown=<id>: the countdown as a calendar file. Public (published countdowns only; RLS hides drafts). */
export async function GET(req: Request) {
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return NextResponse.json({ error: "countdown is required" }, { status: 400 });

  const c = await getCountdownById(q.data.countdown);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ics = buildIcs([{ uid: c.id, title: c.title, startsAt: new Date(c.targetAt), description: "H2H·S2U, an unofficial Hearts2Hearts fan site." }]);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="s2u-countdown.ics"',
      "Cache-Control": "no-store",
    },
  });
}
