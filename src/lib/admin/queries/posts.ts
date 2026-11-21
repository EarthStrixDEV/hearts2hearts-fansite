import "server-only";
import type { Post } from "@/lib/db/types";
import { query, queryOne, hasDb } from "@/lib/neon/db";
import { cleanQ } from "../db";
import { likeOf, POST_COLS, ts, Where } from "../sql";

/** Board tabs map onto content_status: scheduled = published with a future published_at, rejected = archived. */
export type PostTab = "draft" | "scheduled" | "published" | "archived";
export const POST_TABS: { key: PostTab; label: string }[] = [
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Rejected" },
];

export interface PostRow extends Post { tag_names: string[]; tab: PostTab }

export function postTab(p: Pick<Post, "status" | "published_at">, now = Date.now()): PostTab {
  if (p.status === "archived") return "archived";
  if (p.status === "draft") return "draft";
  return p.published_at && Date.parse(p.published_at) > now ? "scheduled" : "published";
}

const TAGS = `coalesce((select array_agg(t.name order by t.name) from post_tags pt join tags t on t.id = pt.tag_id where pt.post_id = posts.id), '{}') as tag_names`;

export async function listPosts(q?: string): Promise<PostRow[]> {
  if (!hasDb()) return [];
  const w = new Where();
  const s = cleanQ(q);
  if (s) w.add("title ilike ?", likeOf(s));
  // body_md is left out of the list; getPost() loads it for the selected post.
  const rows = await query<Omit<PostRow, "tab">>(
    `select id, slug, title, excerpt, ''::text as body_md, cover_id, member_id, source, status, ${ts("published_at")}, ${ts("created_at")}, ${ts("updated_at")}, updated_by, ${TAGS}
       from posts ${w.clause} order by updated_at desc limit 300`,
    w.params,
  );
  const now = Date.now();
  return rows.map((p) => ({ ...p, tab: postTab(p, now) }));
}

export async function getPost(id: string): Promise<(Post & { tag_names: string[] }) | null> {
  if (!hasDb() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<Post & { tag_names: string[] }>(`select ${POST_COLS}, ${TAGS} from posts where id = $1`, [id]);
}
