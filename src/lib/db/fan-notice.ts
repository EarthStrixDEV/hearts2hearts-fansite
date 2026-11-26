import "server-only";
import type { NoticeItem, NoticeJobState, ReminderKind } from "./fan-types";
import { withUser } from "./fan-client";
import { withActor, query } from "@/lib/neon/db";
import { DAILY_JOB_LIMIT, remindAt, StoredItems } from "@/lib/fan/notice";

// AI notice reader data layer. User-facing reads/writes go through withUser() as `fan_app` (RLS: own jobs only).
// fan_app cannot UPDATE notice_jobs, so state changes use the owner client, always after the caller proved the job is theirs.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isJobId = (s: string) => UUID.test(s);

export class RateLimitError extends Error {
  constructor(readonly limit: number) {
    super(`Daily limit of ${limit} notices reached`);
  }
}

export interface NoticeJob {
  id: string;
  state: NoticeJobState;
  model: string | null;
  /** null until the job is done (or when the stored JSON no longer validates) */
  items: NoticeItem[] | null;
  error: string | null;
  createdAt: string;
  /** media.path = object key of the uploaded image */
  imagePath: string;
}

// "Daily" follows the rest of the fan club: the Thai calendar day.
const THAI_DAY_START = "date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'";

/** How many jobs the user has created today (Thai time). Used for a cheap pre-check before uploading. */
export async function jobsToday(userId: string): Promise<number> {
  return withUser(userId, async (q) => {
    const [r] = await q<{ n: number }>(`select count(*)::int as n from notice_jobs where user_id = $1 and created_at >= ${THAI_DAY_START}`, [userId]);
    return r.n;
  });
}

/**
 * Registers an uploaded image: media row + `queued` job, in one transaction. The limit is checked in SQL under a per-user
 * advisory lock, so parallel uploads cannot slip past it. Throws RateLimitError (the caller deletes the stored object).
 */
export async function createJob(userId: string, img: { path: string; mime: string; width?: number | null; height?: number | null }): Promise<{ id: string }> {
  return withUser(userId, async (q) => {
    await q("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`notice:${userId}`]);
    const [c] = await q<{ n: number }>(`select count(*)::int as n from notice_jobs where user_id = $1 and created_at >= ${THAI_DAY_START}`, [userId]);
    if (c.n >= DAILY_JOB_LIMIT) throw new RateLimitError(DAILY_JOB_LIMIT);
    const [m] = await q<{ id: string }>(
      "insert into media (path, mime_type, width, height, alt, uploaded_by) values ($1, $2, $3, $4, 'Fan-uploaded schedule notice', $5) returning id",
      [img.path, img.mime, img.width ?? null, img.height ?? null, userId],
    );
    const [j] = await q<{ id: string }>("insert into notice_jobs (user_id, image_id) values ($1, $2) returning id", [userId, m.id]);
    return { id: j.id };
  });
}

interface JobRow { id: string; state: NoticeJobState; model: string | null; result: unknown; error: string | null; created_at: string; path: string }
const JOB_SQL = `select j.id, j.state, j.model, j.result, j.error, to_json(j.created_at) #>> '{}' as created_at, m.path
                   from notice_jobs j join media m on m.id = j.image_id`;

function toJob(r: JobRow): NoticeJob {
  const parsed = StoredItems.safeParse(r.result);
  return { id: r.id, state: r.state, model: r.model, items: r.state === "done" && parsed.success ? parsed.data : null, error: r.error, createdAt: r.created_at, imagePath: r.path };
}

/** One of the user's own jobs (RLS plus an explicit user filter). null when it does not exist or is someone else's. */
export async function getJob(userId: string, id: string): Promise<NoticeJob | null> {
  if (!isJobId(id)) return null;
  const rows = await withUser(userId, (q) => q<JobRow>(`${JOB_SQL} where j.id = $1 and j.user_id = $2`, [id, userId]));
  return rows[0] ? toJob(rows[0]) : null;
}

/** The user's most recent job, so a refresh does not lose the last reading. */
export async function getLatestJob(userId: string): Promise<NoticeJob | null> {
  const rows = await withUser(userId, (q) => q<JobRow>(`${JOB_SQL} where j.user_id = $1 order by j.created_at desc limit 1`, [userId]));
  return rows[0] ? toJob(rows[0]) : null;
}

// ---- state changes (owner client) ---------------------------------------------------------------
/** queued/failed -> reading. false when the job is already being read or is done (stops double clicks double-spending the LLM). */
export async function claimForReading(jobId: string, userId: string, model: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "update notice_jobs set state = 'reading', model = $3, error = null where id = $1 and user_id = $2 and state in ('queued', 'failed') returning id",
    [jobId, userId, model],
  );
  return rows.length === 1;
}

export async function finishJob(jobId: string, items: NoticeItem[]): Promise<void> {
  await query("update notice_jobs set state = 'done', result = $2::jsonb, error = null where id = $1 and state = 'reading'", [jobId, JSON.stringify(items)]);
}

export async function failJob(jobId: string, message: string): Promise<void> {
  await query("update notice_jobs set state = 'failed', error = $2 where id = $1 and state = 'reading'", [jobId, message.slice(0, 300)]);
}

// ---- reminders (own rows, RLS) --------------------------------------------------------------------
/** Reminder kinds the user has switched on for this job (unsent rows only). */
export async function getReminderKinds(userId: string, jobId: string): Promise<ReminderKind[]> {
  if (!isJobId(jobId)) return [];
  const rows = await withUser(userId, (q) =>
    q<{ kind: ReminderKind }>("select distinct kind from event_reminders where user_id = $1 and job_id = $2 and sent_at is null order by kind", [userId, jobId]),
  );
  return rows.map((r) => r.kind);
}

/**
 * Switches a reminder kind on/off for every timed event of a job. The times come from the stored result, never from the
 * client. Returns how many reminders are set (0 when every moment has already passed). null = no such finished job.
 */
export async function setReminders(userId: string, jobId: string, kind: ReminderKind, on: boolean, now = Date.now()): Promise<number | null> {
  if (!isJobId(jobId)) return null;
  return withUser(userId, async (q) => {
    const [row] = await q<{ result: unknown; state: NoticeJobState }>("select result, state from notice_jobs where id = $1 and user_id = $2", [jobId, userId]);
    const items = row?.state === "done" ? StoredItems.safeParse(row.result) : null;
    if (!items?.success) return null;

    if (!on) {
      await q("delete from event_reminders where user_id = $1 and job_id = $2 and kind = $3 and sent_at is null", [userId, jobId, kind]);
      return 0;
    }
    const idx: number[] = [];
    const at: string[] = [];
    items.data.forEach((it, i) => {
      const t = it.starts_at ? remindAt(kind, it.starts_at, now) : null;
      if (t) { idx.push(i); at.push(t); }
    });
    if (idx.length === 0) return 0;
    await q(
      `insert into event_reminders (user_id, job_id, item_index, remind_at, kind)
       select $1, $2, u.i, u.t, $5 from unnest($3::int[], $4::timestamptz[]) as u(i, t)
       on conflict (user_id, job_id, item_index, kind) do nothing`,
      [userId, jobId, idx, at, kind],
    );
    return idx.length;
  });
}

// ---- send to /schedule (editors; the caller has checked requireRole("editor")) -----------------------
export interface ScheduleResult { created: number; alreadyThere: number; skippedNoTime: number }

/**
 * Inserts one `draft` events row per timed item (owner client: fan_app has no grant on events). Drafts go through the
 * existing admin approval flow. Re-sending the same notice does not duplicate rows.
 */
export async function sendToSchedule(editorId: string, job: NoticeJob, indexes?: number[]): Promise<ScheduleResult> {
  const items = job.items ?? [];
  const want = indexes ? new Set(indexes) : null;
  const res: ScheduleResult = { created: 0, alreadyThere: 0, skippedNoTime: 0 };
  await withActor(editorId, async (q) => {
    for (const [i, it] of items.entries()) {
      if (want && !want.has(i)) continue;
      if (!it.starts_at) { res.skippedNoTime++; continue; }
      const title = (it.title_th.trim() || it.title_ko.trim() || "Untitled event").slice(0, 200);
      const rows = await q<{ id: string }>(
        `insert into events (title, event_type, starts_at, status, updated_by)
         select $1::text, 'other', $2::timestamptz, 'draft', $3::uuid
          where not exists (select 1 from events where title = $1::text and starts_at = $2::timestamptz)
         returning id`,
        [title, it.starts_at, editorId],
      );
      if (rows.length) res.created++; else res.alreadyThere++;
    }
  });
  return res;
}
