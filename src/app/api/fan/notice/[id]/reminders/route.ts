import { z } from "zod";
import { setReminders } from "@/lib/db/fan-notice";
import { gateUser, json } from "@/lib/fan/notice-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ kind: z.enum(["1h", "15m", "vote"]), on: z.boolean() });

/**
 * POST /api/fan/notice/[id]/reminders { kind, on }: switch a reminder kind on/off for every timed event of the job.
 * Rows are saved in event_reminders; nothing sends them yet (there is no notification channel in this repo).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await gateUser(req);
  if (!g.ok) return g.res;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return json(400, { error: "Invalid reminder." });
  const { id } = await ctx.params;
  try {
    const count = await setReminders(g.userId, id, body.data.kind, body.data.on);
    if (count === null) return json(404, { error: "Read a notice first." });
    return json(200, { kind: body.data.kind, on: body.data.on && count > 0, count });
  } catch (e) {
    console.error("notice: reminders failed", e);
    return json(500, { error: "Couldn't save the reminder. Try again." });
  }
}
