import { unstable_cache } from "next/cache";
import { hasDb, query, queryOne } from "@/lib/neon/db";
import type { Post } from "./types";
import { G } from "./seed/music";
import { SEED_POSTS } from "./seed/posts";

export const POSTS_PER_PAGE = 12;

export interface PostTagRef { slug: string; name: string }
export interface PostCardData {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: PostTagRef[];
  published_at: string;
  source: Post["source"];
  read_min: number;
  /** Placeholder cover (no media URL resolution yet). */
  grad: string;
}
export interface PostDetail extends PostCardData { body_md: string }

export interface BlogIndex {
  /** Newest published post, always shown on top regardless of filters. */
  featured: PostCardData | null;
  items: PostCardData[];
  tags: (PostTagRef & { count: number })[];
  page: number;
  pageCount: number;
  /** Items matching the filters, across all pages. */
  total: number;
  /** ISO timestamps of every published post (sidebar calendar). */
  publishedAt: string[];
}

const GRADS = Object.values(G);
const gradFor = (key: string) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
};
const readMin = (md: string) => Math.max(1, Math.ceil(md.split(/\s+/).filter(Boolean).length / 200));

type PostRow = { slug: string; title: string; excerpt: string | null; body_md: string; source: Post["source"]; published_at: string; tags: PostTagRef[] };

// Public read rule (spec §3), enforced in SQL since there is no RLS: status = published AND published_at <= now().
// The short revalidate below lets scheduled posts appear. to_json(...)#>>'{}' keeps published_at an ISO string.
const publishedPosts = (extraWhere = "") => `
  select p.slug, p.title, p.excerpt, p.body_md, p.source, to_json(p.published_at) #>> '{}' as published_at,
         coalesce(json_agg(json_build_object('slug', t.slug, 'name', t.name) order by t.name) filter (where t.id is not null), '[]') as tags
    from posts p
    left join post_tags pt on pt.post_id = p.id
    left join tags t on t.id = pt.tag_id
   where p.status = 'published' and p.published_at <= now() ${extraWhere}
   group by p.id
   order by p.published_at desc`;

const toDetail = (r: PostRow): PostDetail => ({
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  body_md: r.body_md,
  source: r.source,
  published_at: r.published_at,
  tags: r.tags,
  read_min: readMin(r.body_md),
  grad: gradFor(r.slug),
});
const toCard = ({ body_md: _body, ...card }: PostDetail): PostCardData => card;

// Covers are gradient placeholders; cover_id -> media.path -> signedUrl() from @/lib/neon/storage is not wired yet.
// Bodies are dropped before caching so the list entry stays small however many posts exist.
const loadAll = unstable_cache(
  async (): Promise<PostCardData[]> => (await query<PostRow>(publishedPosts())).map((r) => toCard(toDetail(r))),
  ["posts-all"],
  { tags: ["posts"], revalidate: 300 },
);

const loadPost = (slug: string) =>
  unstable_cache(
    async (): Promise<PostDetail | null> => {
      const row = await queryOne<PostRow>(publishedPosts("and p.slug = $1"), [slug]);
      return row ? toDetail(row) : null;
    },
    ["post", slug],
    { tags: ["posts", `post:${slug}`], revalidate: 300 },
  )();

const getAll = async (): Promise<PostCardData[]> =>
  hasDb()
    ? loadAll()
    : SEED_POSTS.map(toCard).sort((a, b) => b.published_at.localeCompare(a.published_at));

/** Blog list: newest post featured, the rest filtered by tag slug / search text and paginated (12 per page). Cache tag `posts`. */
export async function getBlogIndex(opts: { tag?: string; q?: string; page?: number } = {}): Promise<BlogIndex> {
  const all = await getAll();
  const [featured = null, ...rest] = all;
  const q = opts.q?.trim().toLowerCase();
  const matching = rest.filter(
    (p) =>
      (!opts.tag || p.tags.some((t) => t.slug === opts.tag)) &&
      (!q || `${p.title} ${p.excerpt ?? ""}`.toLowerCase().includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(matching.length / POSTS_PER_PAGE));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1) || 1), pageCount);

  const counts = new Map<string, PostTagRef & { count: number }>();
  for (const p of all) for (const t of p.tags) counts.set(t.slug, { ...t, count: (counts.get(t.slug)?.count ?? 0) + 1 });

  return {
    featured,
    items: matching.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE),
    tags: [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    page,
    pageCount,
    total: matching.length,
    publishedAt: all.map((p) => p.published_at),
  };
}

export interface PostPage {
  post: PostDetail;
  /** Up to 3: posts sharing a tag first, then the newest others. */
  related: PostCardData[];
  /** Newer post. */
  next: PostCardData | null;
  /** Older post. */
  prev: PostCardData | null;
}

/** One published post by slug with related/prev/next, or null. Cache tags `posts`, `post:{slug}`. */
export async function getPost(slug: string): Promise<PostPage | null> {
  const post = hasDb() ? await loadPost(slug) : (SEED_POSTS.find((p) => p.slug === slug) ?? null);
  if (!post) return null;
  const all = await getAll();
  const i = all.findIndex((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  const mine = new Set(post.tags.map((t) => t.slug));
  const shared = others.filter((p) => p.tags.some((t) => mine.has(t.slug)));
  const related = [...shared, ...others.filter((p) => !shared.includes(p))].slice(0, 3);
  return { post, related, next: i > 0 ? all[i - 1] : null, prev: i >= 0 ? (all[i + 1] ?? null) : null };
}

/** Slugs of all published posts, for generateStaticParams. */
export async function getPostSlugs(): Promise<string[]> {
  return (await getAll()).map((p) => p.slug);
}
