import { randomUUID } from "node:crypto";
import { createJob, jobsToday, RateLimitError } from "@/lib/db/fan-notice";
import { DAILY_JOB_LIMIT, MAX_IMAGE_BYTES, sniffNoticeImage } from "@/lib/fan/notice";
import { gateUser, json } from "@/lib/fan/notice-api";
import { hasStorage, storage } from "@/lib/neon/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tooMany = () => json(429, { error: `You can read ${DAILY_JOB_LIMIT} notices per day. Try again tomorrow (Thai time).` });

/**
 * POST multipart { file } → stores `notices/<uuid>.<ext>` in the private bucket, inserts a media row and a `queued`
 * notice_jobs row. PNG / JPEG / WebP up to 8 MB (checked on the bytes). 10 jobs per user per Thai day, checked in SQL.
 */
export async function POST(req: Request) {
  const g = await gateUser(req);
  if (!g.ok) return g.res;
  if (!hasStorage()) return json(503, { error: "Image storage isn't configured." });

  // refuse an oversized body before buffering it (the multipart envelope adds a little to the file itself)
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) return json(413, { error: "Images must be 8 MB or smaller." });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json(400, { error: "No image received." });
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return json(413, { error: "Images must be between 1 byte and 8 MB." });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffNoticeImage(bytes);
  if (!type) return json(415, { error: "Only PNG, JPEG or WebP images can be read." });

  try {
    if ((await jobsToday(g.userId)) >= DAILY_JOB_LIMIT) return tooMany(); // cheap early exit; createJob re-checks under a lock
  } catch (e) {
    console.error("notice: limit check failed", e);
    return json(500, { error: "Something went wrong. Try again." });
  }

  const key = `notices/${randomUUID()}.${type.ext}`;
  try {
    await storage().upload(key, bytes, { contentType: type.mime });
    const { id } = await createJob(g.userId, { path: key, mime: type.mime });
    return json(201, { id });
  } catch (e) {
    await storage().delete(key).catch(() => undefined);
    if (e instanceof RateLimitError) return tooMany();
    console.error("notice: upload failed", e);
    return json(500, { error: "Upload failed. Try again." });
  }
}
