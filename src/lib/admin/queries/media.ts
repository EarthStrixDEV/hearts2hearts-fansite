import "server-only";
import type { Media } from "@/lib/db/types";
import { isRemoteImageUrl } from "@/lib/media-url";
import { query, queryOne, hasDb } from "@/lib/neon/db";
import { cleanQ } from "../db";
import { likeOf, MEDIA_COLS, Where } from "../sql";

export interface MediaUse { label: string; href: string }

export async function listMedia(q?: string, filter?: string): Promise<Media[]> {
  if (!hasDb()) return [];
  const w = new Where();
  const s = cleanQ(q);
  if (s) w.add("(path ilike ? or alt ilike ? or credit ilike ?)", likeOf(s));
  if (filter === "images") w.add("mime_type like 'image/%'");
  if (filter === "noalt") w.add("mime_type like 'image/%' and (alt is null or btrim(alt) = '')");
  return query<Media>(`select ${MEDIA_COLS} from media ${w.clause} order by created_at desc limit 500`, w.params);
}

export async function getMedia(id: string): Promise<Media | null> {
  if (!hasDb() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<Media>(`select ${MEDIA_COLS} from media where id = $1`, [id]);
}

/** media.id → where it is used (spec: "ดูว่าไฟล์ถูกใช้ที่ไหน"). Scans every FK that points at media. */
export async function mediaUsage(): Promise<Map<string, MediaUse[]>> {
  const out = new Map<string, MediaUse[]>();
  if (!hasDb()) return out;
  const add = (id: string | null | undefined, use: MediaUse) => {
    if (!id) return;
    const list = out.get(id) ?? [];
    list.push(use);
    out.set(id, list);
  };
  const [members, albums, posts, events, slides] = await Promise.all([
    query<{ id: string; stage_name: string; avatar_id: string | null; cover_id: string | null; gallery_ids: string[] | null }>(`select id, stage_name, avatar_id, cover_id, gallery_ids from members`),
    query<{ id: string; title: string; cover_id: string | null }>(`select id, title, cover_id from albums`),
    query<{ id: string; title: string; cover_id: string | null }>(`select id, title, cover_id from posts`),
    query<{ id: string; title: string; poster_id: string | null }>(`select id, title, poster_id from events`),
    query<{ id: string; headline: string | null; image_id: string | null }>(`select id, headline, image_id from hero_slides`),
  ]);
  for (const m of members) {
    const href = `/admin/members?id=${m.id}`;
    add(m.avatar_id, { label: `${m.stage_name} · avatar`, href });
    add(m.cover_id, { label: `${m.stage_name} · cover`, href });
    for (const g of m.gallery_ids ?? []) add(g, { label: `${m.stage_name} · gallery`, href });
  }
  for (const a of albums) add(a.cover_id, { label: `${a.title} · cover`, href: `/admin/music?id=${a.id}` });
  for (const p of posts) add(p.cover_id, { label: `${p.title} · cover`, href: `/admin/posts?id=${p.id}` });
  for (const e of events) add(e.poster_id, { label: `${e.title} · poster`, href: `/admin/events?id=${e.id}` });
  for (const s of slides) add(s.image_id, { label: `Home hero · ${s.headline ?? "slide"}`, href: "/" });
  return out;
}

/** Options for the cover/avatar/poster pickers in the forms. */
export async function mediaOptions(): Promise<{ id: string; label: string }[]> {
  if (!hasDb()) return [];
  const rows = await query<{ id: string; path: string; alt: string | null }>(`select id, path, alt from media where mime_type like 'image/%' order by created_at desc limit 300`);
  const name = (p: string) => (isRemoteImageUrl(p) ? `${p.includes("ytimg") ? "YT Music" : "X"} · ${p.includes("ytimg") ? (p.split("/").slice(-2)[0] ?? p) : (p.split("/").pop() ?? p).split("?")[0]}` : (p.split("/").pop() ?? p));
  return rows.map((m) => ({ id: m.id, label: m.alt ? `${name(m.path)} — ${m.alt}` : name(m.path) }));
}

/** media.id → object key, to render thumbnails next to pickers. */
export async function mediaPaths(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const want = [...new Set(ids.filter((i): i is string => !!i))];
  if (!hasDb() || !want.length) return out;
  const rows = await query<{ id: string; path: string }>(`select id, path from media where id = any($1::uuid[])`, [want]);
  for (const m of rows) out.set(m.id, m.path);
  return out;
}
