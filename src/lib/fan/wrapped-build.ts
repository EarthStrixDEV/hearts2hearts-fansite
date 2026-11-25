import "server-only";
import { query } from "@/lib/neon/db";
import { hasStorage, storage } from "@/lib/neon/storage";
import { buildSlides, WrappedData } from "./wrapped";
import { renderSlidePng } from "./wrapped-image";

// Yearly Fan Wrapped build. OWNER client (bypasses RLS): only the cron route and tests import this, never a user-facing route.
// Safe to rerun: snapshots are upserted on (user_id, year); rendered images are kept while the numbers on the slides are unchanged
// (the fandom totals are not on any slide, so a change there alone does not re-render).

export interface WrappedStore { put(key: string, png: Uint8Array): Promise<void> }
const bucketStore: WrappedStore = { put: async (key, png) => { await storage().upload(key, png, { contentType: "image/png" }); } };

export interface BuildOptions {
  /** Only write snapshots for these users (ranks are still computed among every fan). Tests and one-off repairs. */
  only?: string[] | null;
  /** Where PNGs go. Default: the `assets` bucket when it is configured, otherwise images are skipped. */
  store?: WrappedStore | null;
  /** Stop rendering after this many ms (the cron has a time limit); the next run continues where this one stopped. */
  budgetMs?: number;
  /** Clock for the budget (tests). */
  now?: () => number;
}

export interface BuildResult { year: number; upserted: number; rendered: number; failed: number; remaining: number; imagesSkipped: boolean }

/** Object key of slide `i` of a fan's Wrapped. */
export const wrappedKey = (year: number, userId: string, i: number) => `wrapped/${year}/${userId}/${i}.png`;

/**
 * Aggregates one year of fan_activity per fan into wrapped_snapshots. The year is Thai calendar time (the daily limits use it too).
 * Counted: every activity row except `stream_log` (no stream source exists, so nothing is claimed about streams).
 * Rank: standard competition rank by action count among unbanned fans with at least one action that year.
 */
export async function upsertSnapshots(year: number, only: string[] | null = null): Promise<number> {
  const rows = await query<{ user_id: string }>(
    `with win as (
       select make_timestamptz($1::int, 1, 1, 0, 0, 0, 'Asia/Bangkok') as s,
              make_timestamptz($1::int + 1, 1, 1, 0, 0, 0, 'Asia/Bangkok') as e
     ), act as (
       select a.user_id,
              count(*)::int as score,
              count(*) filter (where a.kind = 'login')::int as logins,
              count(*) filter (where a.kind = 'mission')::int as missions,
              count(*) filter (where a.kind = 'live_attend')::int as live_attended,
              count(distinct (a.created_at at time zone 'Asia/Bangkok')::date)::int as active_days
         from fan_activity a
         join profiles p on p.id = a.user_id and not p.is_banned
        cross join win
        where a.kind <> 'stream_log' and a.created_at >= win.s and a.created_at < win.e
        group by a.user_id
     ), ranked as (
       select act.*, rank() over (order by score desc)::int as rank, count(*) over ()::int as fans, (sum(score) over ())::int as actions
         from act
     ), cards as (
       select fc.user_id,
              count(*) filter (where fc.state = 'have')::int as have,
              count(*) filter (where fc.state = 'want')::int as want
         from fan_cards fc join photocards pc on pc.id = fc.photocard_id and pc.status = 'published'
        group by fc.user_id
     ), total as (select count(*)::int as n from photocards where status = 'published'),
     built as (
       select r.user_id,
              jsonb_build_object(
                'v', 1, 'year', $1::int,
                'nickname', coalesce(nullif(btrim(fp.nickname), ''), nullif(btrim(p.display_name), ''), 'S2U fan'),
                'score', r.score, 'rank', r.rank, 'fans', r.fans,
                'activeDays', r.active_days, 'logins', r.logins, 'missions', r.missions, 'liveAttended', r.live_attended,
                'binder', jsonb_build_object('have', coalesce(c.have, 0), 'want', coalesce(c.want, 0), 'total', (select n from total)),
                'bias', case when m.id is null then null else jsonb_build_object(
                          'id', m.id, 'name', m.stage_name, 'color', m.color_hex,
                          'have', (select count(*)::int from fan_cards fc2
                                    join photocards pc2 on pc2.id = fc2.photocard_id and pc2.status = 'published'
                                   where fc2.user_id = r.user_id and fc2.state = 'have' and pc2.member_id = m.id)) end,
                'fandom', jsonb_build_object('fans', r.fans, 'actions', r.actions),
                'images', '[]'::jsonb
              ) as data
         from ranked r
         join profiles p on p.id = r.user_id
         left join fan_profiles fp on fp.user_id = r.user_id
         left join members m on m.id = fp.bias_member_id and m.status = 'published'
         left join cards c on c.user_id = r.user_id
        where $2::uuid[] is null or r.user_id = any($2::uuid[])
     )
     insert into wrapped_snapshots as w (user_id, year, data)
     select user_id, $1::int, data from built
     on conflict (user_id, year) do update set
       data = case when (w.data - 'images' - 'fandom') = (excluded.data - 'images' - 'fandom')
                   then excluded.data || jsonb_build_object('images', coalesce(w.data -> 'images', '[]'::jsonb))
                   else excluded.data end,
       image_id = case when (w.data - 'images' - 'fandom') = (excluded.data - 'images' - 'fandom') then w.image_id else null end
     returning user_id`,
    [year, only],
  );
  return rows.length;
}

/** Renders and stores the PNGs of every snapshot of `year` that has none yet. Returns how many fans were done / failed. */
async function renderPending(year: number, o: Required<Pick<BuildOptions, "budgetMs" | "now">> & { only: string[] | null; store: WrappedStore }) {
  const deadline = o.now() + o.budgetMs;
  const todo = await query<{ user_id: string; data: unknown }>(
    `select user_id, data from wrapped_snapshots
      where year = $1 and jsonb_array_length(coalesce(data -> 'images', '[]'::jsonb)) = 0 and ($2::uuid[] is null or user_id = any($2::uuid[]))
      order by user_id limit 5000`,
    [year, o.only],
  );
  let rendered = 0;
  let failed = 0;
  for (const row of todo) {
    if (o.now() >= deadline) break;
    const parsed = WrappedData.safeParse(row.data);
    if (!parsed.success) { failed++; console.error("build-wrapped: bad snapshot", row.user_id); continue; }
    const data = parsed.data;
    try {
      const slides = buildSlides(data);
      const keys: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const key = wrappedKey(year, row.user_id, i);
        await o.store.put(key, await renderSlidePng(slides[i], i, slides.length, data.nickname));
        keys.push(key);
      }
      // media row for the cover slide (wrapped_snapshots.image_id); the other slides are found by their deterministic key
      const [m] = await query<{ id: string }>(
        `insert into media (path, mime_type, width, height, alt) values ($1, 'image/png', 1080, 1920, $2)
         on conflict (path) do update set mime_type = excluded.mime_type returning id`,
        [keys[0], `S2U Wrapped ${year} cover`],
      );
      const { images, fandom, ...numbers } = row.data as Record<string, unknown>;
      void images; void fandom;
      const done = await query(
        `update wrapped_snapshots set data = data || jsonb_build_object('images', $3::jsonb), image_id = $4
          where user_id = $1 and year = $2 and (data - 'images' - 'fandom') = $5::jsonb returning user_id`,
        [row.user_id, year, JSON.stringify(keys), m.id, JSON.stringify(numbers)],
      );
      if (done.length) rendered++; // 0 rows: the numbers changed while rendering, the next run redoes it
    } catch (e) {
      failed++;
      console.error("build-wrapped: render failed for", row.user_id, e);
    }
  }
  return { rendered, failed };
}

/** The whole yearly job: upsert every fan's snapshot, then render what is missing within the time budget. */
export async function buildWrapped(year: number, opts: BuildOptions = {}): Promise<BuildResult> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error(`buildWrapped: bad year ${year}`);
  const only = opts.only ?? null;
  const upserted = await upsertSnapshots(year, only);

  const store = opts.store === undefined ? (hasStorage() ? bucketStore : null) : opts.store;
  let rendered = 0;
  let failed = 0;
  if (store) {
    ({ rendered, failed } = await renderPending(year, { only, store, budgetMs: opts.budgetMs ?? 240_000, now: opts.now ?? Date.now }));
  }
  const [left] = await query<{ n: number }>(
    `select count(*)::int as n from wrapped_snapshots
      where year = $1 and jsonb_array_length(coalesce(data -> 'images', '[]'::jsonb)) = 0 and ($2::uuid[] is null or user_id = any($2::uuid[]))`,
    [year, only],
  );
  return { year, upserted, rendered, failed, remaining: left?.n ?? 0, imagesSkipped: store === null };
}
