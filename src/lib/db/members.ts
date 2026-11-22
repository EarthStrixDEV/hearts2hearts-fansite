import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import { resolveMediaUrls } from "./media";
import type { Member, MemberFact } from "./types";
import { FACT, SEED_ERAS, SEED_MEMBERS, SEED_MEMBER_TRACKS, type EraStub, type TrackStub } from "./seed/members";

export { FACT };
export interface MemberPhotos { avatar: string | null; cover: string | null; gallery: string[] }
export type MemberWithFacts = Member & { facts: Pick<MemberFact, "label" | "value">[]; photos?: MemberPhotos };

const REVALIDATE = 3600;

// pg returns date/timestamptz as JS Date; the row types promise strings, so cast in SQL.
const loadMembers = async (): Promise<MemberWithFacts[]> => {
  if (!hasDb()) return SEED_MEMBERS;
  const rows = await query<MemberWithFacts>(
    `select m.id, m.slug, m.stage_name, m.name_ko, m.real_name, m.birth_date::text as birth_date, m.position, m.color_hex, m.bio,
            m.avatar_id, m.cover_id, coalesce(m.gallery_ids, '{}') as gallery_ids, m.sort_order, m.status,
            m.created_at::text as created_at, m.updated_at::text as updated_at, m.updated_by,
            coalesce((select json_agg(json_build_object('label', f.label, 'value', f.value) order by f.sort_order)
                      from member_facts f where f.member_id = m.id), '[]'::json) as facts
       from members m
      where m.status = 'published'
      order by m.sort_order`,
  );
  // Photos live in the media library (bucket object or X CDN URL); resolve them once for the whole list.
  const urls = await resolveMediaUrls(rows.flatMap((m) => [m.avatar_id, m.cover_id, ...m.gallery_ids]));
  return rows.map((m) => ({
    ...m,
    photos: {
      avatar: (m.avatar_id && urls.get(m.avatar_id)) || null,
      cover: (m.cover_id && urls.get(m.cover_id)) || null,
      gallery: m.gallery_ids.map((id) => urls.get(id)).filter((u): u is string => !!u),
    },
  }));
};

/** Published members by sort_order. Cache tag `members`. */
export const getMembers = unstable_cache(loadMembers, ["members:list"], { tags: ["members"], revalidate: REVALIDATE });

/** One published member with facts, or null. Cache tag `member:{slug}`. */
export const getMember = (slug: string): Promise<MemberWithFacts | null> =>
  unstable_cache(
    async () => (await loadMembers()).find((m) => m.slug === slug) ?? null,
    ["member", slug],
    { tags: [`member:${slug}`], revalidate: REVALIDATE },
  )();

/** Tracks a member takes part in (track_members). Seed stub when there is no DB. Cache tag `member:{slug}`. */
export const getMemberTracks = (member: Pick<Member, "id" | "slug">): Promise<TrackStub[]> =>
  unstable_cache(
    async (): Promise<TrackStub[]> => {
      if (!hasDb()) return SEED_MEMBER_TRACKS;
      return query<TrackStub>(
        `select t.title, a.title as album
           from track_members tm
           join tracks t on t.id = tm.track_id
           join albums a on a.id = t.album_id
          where tm.member_id = $1 and a.status = 'published'
          order by a.release_date nulls last, t.track_no
          limit 8`,
        [member.id],
      );
    },
    ["member:tracks", member.slug],
    { tags: [`member:${member.slug}`, "music"], revalidate: REVALIDATE },
  )();

/** Release timeline (albums by date) for the member timeline / photocard collection. Seed stub when there is no DB. */
export const getEras = unstable_cache(
  async (): Promise<EraStub[]> => {
    if (!hasDb()) return SEED_ERAS;
    const label = { single: "Single", ep: "EP", album: "Album" } as const;
    const rows = await query<{ title: string; date: string; album_type: keyof typeof label }>(
      `select title, release_date::text as date, album_type
         from albums
        where status = 'published' and release_date is not null
        order by release_date`,
    );
    return rows.map((a) => ({ title: a.title, date: a.date, body: label[a.album_type] }));
  },
  ["eras"],
  { tags: ["music"], revalidate: REVALIDATE },
);
