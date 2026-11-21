import "server-only";
import type { ActivityLog, AiJob, EventRow, Post } from "@/lib/db/types";
import { query, queryOne, hasDb } from "@/lib/neon/db";
import { dt, EVENT_COLS, ts } from "../sql";

export interface VerifyRow { field: string; where: string; done: number; total: number; href: string }
export interface DashboardData {
  counts: { members: number; albums: number; published: number; drafts: number; upcoming: number };
  review: (Pick<Post, "id" | "title" | "source" | "updated_at" | "created_at">)[];
  nextEvents: EventRow[];
  lastPast: EventRow | null;
  job: AiJob | null;
  activity: { entry: ActivityLog; actor: string }[];
  verify: VerifyRow[];
}

const EMPTY: DashboardData = {
  counts: { members: 0, albums: 0, published: 0, drafts: 0, upcoming: 0 }, review: [], nextEvents: [], lastPast: null, job: null, activity: [], verify: [],
};

/** Number of draft posts, for the sidebar badge. */
export async function draftPostCount(): Promise<number> {
  if (!hasDb()) return 0;
  const r = await queryOne<{ n: number }>(`select count(*)::int as n from posts where status = 'draft'`);
  return r?.n ?? 0;
}

export async function getDashboard(): Promise<DashboardData> {
  if (!hasDb()) return EMPTY;
  const [c, review, nextEvents, past, job, log] = await Promise.all([
    queryOne<Record<string, number>>(`select
        (select count(*)::int from members) as members,
        (select count(*)::int from albums) as albums,
        (select count(*)::int from posts where status = 'published') as published,
        (select count(*)::int from posts where status = 'draft') as drafts,
        (select count(*)::int from events where starts_at >= now() and status <> 'archived') as upcoming,
        (select count(*)::int from members where birth_date is null) as m_birth,
        (select count(*)::int from members where bio is null or btrim(bio) = '') as m_bio,
        (select count(*)::int from members where avatar_id is null) as m_avatar,
        (select count(*)::int from albums where release_date is null) as a_date,
        (select count(*)::int from albums where cover_id is null) as a_cover,
        (select count(*)::int from media) as media_total,
        (select count(*)::int from media where mime_type like 'image/%' and (alt is null or btrim(alt) = '')) as media_noalt`),
    query<DashboardData["review"][number]>(`select id, title, source, ${ts("updated_at")}, ${ts("created_at")} from posts where status = 'draft' order by created_at desc limit 5`),
    query<EventRow>(`select ${EVENT_COLS} from events where starts_at >= now() order by starts_at limit 3`),
    query<EventRow>(`select ${EVENT_COLS} from events where starts_at < now() order by starts_at desc limit 1`),
    query<AiJob>(`select id, ${dt("run_date")}, topic, prompt, model, post_id, state, error, ${ts("created_at")} from ai_jobs order by run_date desc limit 1`),
    query<ActivityLog & { actor_name: string | null }>(
      `select l.id::int as id, l.actor_id, l.action, l.entity, l.entity_id, ${ts("l.created_at")}, p.display_name as actor_name
         from activity_log l left join profiles p on p.id = l.actor_id order by l.id desc limit 6`,
    ),
  ]);
  const n = c ?? {};
  const v = (field: string, where: string, missing: number, total: number, href: string): VerifyRow => ({ field, where, total, done: Math.max(total - missing, 0), href });
  return {
    counts: { members: n.members ?? 0, albums: n.albums ?? 0, published: n.published ?? 0, drafts: n.drafts ?? 0, upcoming: n.upcoming ?? 0 },
    review,
    nextEvents,
    lastPast: past[0] ?? null,
    job: job[0] ?? null,
    activity: log.map((entry) => ({ entry, actor: entry.actor_id ? entry.actor_name ?? "Editor" : "System" })),
    verify: [
      v("Birth dates", `${n.members ?? 0} member profiles`, n.m_birth ?? 0, n.members ?? 0, "/admin/members"),
      v("Bios", `${n.members ?? 0} member profiles`, n.m_bio ?? 0, n.members ?? 0, "/admin/members"),
      v("Member avatars", `${n.members ?? 0} member profiles`, n.m_avatar ?? 0, n.members ?? 0, "/admin/members"),
      v("Release dates", `${n.albums ?? 0} releases`, n.a_date ?? 0, n.albums ?? 0, "/admin/music"),
      v("Release covers", `${n.albums ?? 0} releases`, n.a_cover ?? 0, n.albums ?? 0, "/admin/music"),
      v("Media alt text", `${n.media_total ?? 0} files`, n.media_noalt ?? 0, n.media_total ?? 0, "/admin/media?f=noalt"),
    ],
  };
}
