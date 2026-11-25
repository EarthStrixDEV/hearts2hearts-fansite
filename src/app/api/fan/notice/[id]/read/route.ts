import { callLLM, DEFAULT_MODEL } from "@/lib/ai/llm";
import { claimForReading, failJob, finishJob, getJob } from "@/lib/db/fan-notice";
import { MAX_IMAGE_BYTES, NOTICE_SYSTEM, noticeUserPrompt, parseNoticeReply, sniffNoticeImage } from "@/lib/fan/notice";
import { gateUser, json } from "@/lib/fan/notice-api";
import { hasStorage, storage } from "@/lib/neon/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // the LLM call alone may take up to 45 s

/** What the user sees when a job fails; the real error goes to the server log only. */
const FRIENDLY = {
  format: "The AI reply wasn't in the expected format. Try reading again.",
  service: "The AI service couldn't read this image. Try reading again.",
} as const;

/**
 * POST /api/fan/notice/[id]/read: queued/failed → reading → done/failed.
 * Answers 200 with `{ state, items | error }` once the job was claimed (a failed read is a valid outcome, not a server error);
 * 404 / 409 / 503 when it never started.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await gateUser(req);
  if (!g.ok) return g.res;
  const { id } = await ctx.params;

  const job = await getJob(g.userId, id).catch((e) => {
    console.error("notice: job lookup failed", e);
    return undefined;
  });
  if (job === undefined) return json(500, { error: "Something went wrong. Try again." });
  if (!job) return json(404, { error: "Notice not found." });
  if (job.state === "done") return json(200, { state: "done", items: job.items ?? [] }); // already read: no second LLM call
  if (job.state === "reading") return json(409, { error: "This notice is already being read." });

  if (!process.env.LLM_API_KEY || !hasStorage()) return json(503, { error: "AI reading isn't switched on yet." });
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;

  if (!(await claimForReading(job.id, g.userId, model))) return json(409, { error: "This notice is already being read." });

  try {
    const file = await storage().download(job.imagePath);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = bytes.length <= MAX_IMAGE_BYTES ? sniffNoticeImage(bytes) : null;
    if (!type) throw new Error("stored image is missing or not a supported image");

    const reply = await callLLM({
      system: NOTICE_SYSTEM,
      user: noticeUserPrompt(Date.now()),
      model,
      maxTokens: 3000,
      images: [{ mediaType: type.mime, data: Buffer.from(bytes).toString("base64") }],
    });

    let items;
    try {
      items = parseNoticeReply(reply); // bad JSON → failed, never a crash
    } catch (e) {
      console.error("notice: unusable LLM reply", job.id, e instanceof Error ? e.message : e);
      await failJob(job.id, FRIENDLY.format);
      return json(200, { state: "failed", error: FRIENDLY.format });
    }
    await finishJob(job.id, items);
    return json(200, { state: "done", items });
  } catch (e) {
    console.error("notice: read failed", job.id, e instanceof Error ? e.message : e);
    await failJob(job.id, FRIENDLY.service).catch(() => undefined);
    return json(200, { state: "failed", error: FRIENDLY.service });
  }
}
