import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import { hasStorage, signedUrl } from "@/lib/neon/storage";
import { getMembers, type MemberWithFacts } from "./members";
import { PLACEHOLDER_GRADS, SEED_NEXT_EVENT, SEED_POSTS, SEED_RELEASE, SEED_SLIDES, SEED_TOP5 } from "./seed/home";

export interface HomeSlide { id: string; name: string; subline: string; imageUrl: string | null; grad: string }
export interface HomeRelease { title: string; typeLabel: string; releaseDate: string | null; spotifyUrl: string | null; grad: string }
export interface HomeTrack { title: string; album: string; grad: string }
export interface HomePost {
  href: string; title: string; excerpt: string; publishedAt: string; readMin: number; isAi: boolean; grad: string; tags: { label: string; bg: string }[];
}
export interface HomeEvent { title: string; place: string; startsAt: string }
export interface HomeData {
  slides: HomeSlide[];
  members: MemberWithFacts[];
  release: HomeRelease | null;
  top5: HomeTrack[];
  posts: HomePost[];
  nextEvent: HomeEvent | null;
}
type Section = Omit<HomeData, "members">;

const TAG_BG = ["#FFE3F1", "#DDF0FF", "#FFF1D6"];
const TYPE_LABEL = { single: "Single", ep: "EP", album: "Album" } as const;
const grad = (i: number) => PLACEHOLDER_GRADS[i % PLACEHOLDER_GRADS.length];
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS"Z"'`;
// Signed URLs outlive the 1h cache window, so a cached slide never points at an expired link.
const SIGN_TTL = 24 * 3600;

async function imageUrl(key: string | null): Promise<string | null> {
  if (!key || !hasStorage()) return null;
  try {
    return await signedUrl(key, SIGN_TTL);
  } catch {
    return null; // missing object / storage hiccup: fall back to the gradient placeholder
  }
}

async function loadSections(): Promise<Section> {
  if (!hasDb()) {
    return { slides: SEED_SLIDES, release: SEED_RELEASE, top5: SEED_TOP5, posts: SEED_POSTS, nextEvent: SEED_NEXT_EVENT };
  }
  const [slides, albums, tracks, posts, events] = await Promise.all([
    query<{ id: string; headline: string | null; subline: string | null; path: string | null }>(
      `select h.id, h.headline, h.subline, m.path
         from hero_slides h left join media m on m.id = h.image_id
        where h.status = 'published'
          and (h.show_from is null or h.show_from <= now())
          and (h.show_until is null or h.show_until >= now())
        order by h.sort_order`,
    ),
    query<{ title: string; album_type: keyof typeof TYPE_LABEL; release_date: string | null; spotify_url: string | null }>(
      `select title, album_type, release_date::text as release_date, spotify_url
         from albums
        where status = 'published' and release_date <= current_date
        order by release_date desc limit 1`,
    ),
    query<{ title: string; album: string; year: number | null }>(
      `select t.title, a.title as album, extract(year from a.release_date)::int as year
         from tracks t join albums a on a.id = t.album_id
        where a.status = 'published'
        order by t.is_title_track desc, a.release_date desc nulls last, t.track_no
        limit 5`,
    ),
    query<{ slug: string; title: string; excerpt: string | null; body_md: string; source: "human" | "ai"; published_at: string; tags: string[] }>(
      `select p.slug, p.title, p.excerpt, p.body_md, p.source,
              to_char(p.published_at at time zone 'UTC', ${ISO}) as published_at,
              coalesce((select json_agg(tg.name order by tg.name)
                          from post_tags pt join tags tg on tg.id = pt.tag_id
                         where pt.post_id = p.id), '[]'::json) as tags
         from posts p
        where p.status = 'published' and p.published_at <= now()
        order by p.published_at desc limit 3`,
    ),
    query<{ title: string; venue: string | null; city: string | null; starts_at: string }>(
      `select title, venue, city, to_char(starts_at at time zone 'UTC', ${ISO}) as starts_at
         from events
        where status = 'published' and not is_cancelled and starts_at >= now()
        order by starts_at limit 1`,
    ),
  ]);

  const a = albums[0];
  const e = events[0];
  return {
    slides: await Promise.all(
      slides.map(async (s, i) => ({ id: s.id, name: s.headline ?? "", subline: s.subline ?? "", imageUrl: await imageUrl(s.path), grad: grad(i) })),
    ),
    release: a
      ? { title: a.title, typeLabel: TYPE_LABEL[a.album_type], releaseDate: a.release_date, spotifyUrl: a.spotify_url, grad: SEED_RELEASE.grad }
      : null,
    top5: tracks.map((t, i) => ({ title: t.title, album: t.year ? `${t.album} · ${t.year}` : t.album, grad: grad(i) })),
    posts: posts.map((p, i) => ({
      href: `/blog/${p.slug}`,
      title: p.title,
      excerpt: p.excerpt ?? "",
      publishedAt: p.published_at,
      readMin: Math.max(1, Math.ceil(p.body_md.split(/\s+/).length / 200)),
      isAi: p.source === "ai",
      grad: grad(i),
      tags: p.tags.slice(0, 2).map((label, k) => ({ label, bg: TAG_BG[k % TAG_BG.length] })),
    })),
    nextEvent: e ? { title: e.title, place: [e.city, e.venue].filter(Boolean).join(" · "), startsAt: e.starts_at } : null,
  };
}

const getSections = unstable_cache(loadSections, ["home:sections"], {
  tags: ["home", "music", "posts", "events"],
  revalidate: 3600,
});

/** Everything the home page needs. Slides/release/top5/posts/event share the `home` tag; members come from the `members` cache. */
export async function getHomeData(): Promise<HomeData> {
  const [sections, members] = await Promise.all([getSections(), getMembers()]);
  return { ...sections, members };
}
