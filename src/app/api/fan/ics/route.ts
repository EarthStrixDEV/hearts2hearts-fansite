import { NextResponse } from "next/server";
import { z } from "zod";
import { getCountdownById } from "@/lib/db/fan";
import { hasFanDb } from "@/lib/db/fan-client";
import { getJob } from "@/lib/db/fan-notice";
import { getSessionUserId } from "@/lib/db/fan-session";
import { buildIcs, type IcsEvent } from "@/lib/fan/ics";
import { googleCalendarUrl, noticeTitle } from "@/lib/fan/notice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CountdownQuery = z.object({ countdown: z.string().min(1).max(64) });
const JobQuery = z.object({
  job: z.string().min(1).max(64),
  i: z.union([z.literal("all"), z.string().regex(/^\d{1,3}$/)]),
  format: z.enum(["ics", "google"]).default("ics"),
});

const DESCRIPTION = "H2H·S2U, an unofficial Hearts2Hearts fan site. Read by AI from a notice image: check the original.";
const err = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * GET /api/fan/ics?countdown=<id>: the countdown as a calendar file. Public (published countdowns only; RLS hides drafts).
 * GET /api/fan/ics?job=<id>&i=<index|all>: events of the signed-in fan's own notice reading. `&format=google` redirects to a
 * Google Calendar template link instead of downloading the file (one event only).
 */
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  if ("job" in params) return jobCalendar(params);

  const q = CountdownQuery.safeParse(params);
  if (!q.success) return err(400, "countdown is required");

  const c = await getCountdownById(q.data.countdown);
  if (!c) return err(404, "not found");

  const ics = buildIcs([{ uid: c.id, title: c.title, startsAt: new Date(c.targetAt), description: "H2H·S2U, an unofficial Hearts2Hearts fan site." }]);
  return icsResponse(ics, "s2u-countdown.ics");
}

async function jobCalendar(params: Record<string, string>) {
  const q = JobQuery.safeParse(params);
  if (!q.success) return err(400, "job and i are required");
  if (!hasFanDb()) return err(503, "The fan club database isn't configured.");

  let userId: string | null = null;
  try {
    userId = await getSessionUserId();
  } catch (e) {
    console.error("ics: session lookup failed", e);
  }
  if (!userId) return err(401, "Sign in to download your events.");

  const job = await getJob(userId, q.data.job);
  if (!job || job.state !== "done") return err(404, "not found");

  const timed = (job.items ?? []).flatMap((it, index) => (it.starts_at ? [{ index, title: noticeTitle(it), startsAt: it.starts_at }] : []));
  const picked = q.data.i === "all" ? timed : timed.filter((t) => t.index === Number(q.data.i));
  if (picked.length === 0) return err(404, "That event has no time to add to a calendar.");

  if (q.data.format === "google") {
    if (picked.length !== 1) return err(400, "Google Calendar links take one event at a time.");
    return NextResponse.redirect(googleCalendarUrl(picked[0].title, picked[0].startsAt), 302);
  }

  const events: IcsEvent[] = picked.map((t) => ({ uid: `${job.id}-${t.index}`, title: t.title, startsAt: new Date(t.startsAt), description: DESCRIPTION }));
  return icsResponse(buildIcs(events), picked.length === 1 ? `s2u-event-${picked[0].index + 1}.ics` : "s2u-events.ics");
}

const icsResponse = (body: string, filename: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
