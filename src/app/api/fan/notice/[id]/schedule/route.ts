import { z } from "zod";
import { getJob, sendToSchedule } from "@/lib/db/fan-notice";
import { json, sameOrigin } from "@/lib/fan/notice-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ indexes: z.array(z.number().int().min(0).max(100)).max(100).optional() });

/**
 * POST /api/fan/notice/[id]/schedule { indexes? }: editors only. Inserts `draft` rows into `events`; they go through the
 * existing admin approval flow before /schedule shows them.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return json(403, { error: "bad_origin" });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return json(400, { error: "Invalid request." });

  let editor: { id: string } | null;
  try {
    const { requireRole } = await import("@/lib/auth/session"); // throws at import when the auth env is missing
    editor = await requireRole("editor");
  } catch (e) {
    console.error("notice: role check failed", e);
    return json(401, { error: "Sign in as an editor." });
  }
  if (!editor) return json(403, { error: "Only editors can send events to /schedule." });

  const { id } = await ctx.params;
  try {
    const job = await getJob(editor.id, id);
    if (!job || job.state !== "done") return json(404, { error: "Read a notice first." });
    const result = await sendToSchedule(editor.id, job, body.data.indexes);
    return json(200, result as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("notice: send to schedule failed", e);
    return json(500, { error: "Couldn't send to /schedule. Try again." });
  }
}
