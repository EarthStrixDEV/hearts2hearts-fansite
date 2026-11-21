"use server";

import { queryOne, withActor } from "@/lib/neon/db";
import { gate } from "../auth";
import { dbError, fail, fallbackSlug, fmtDateTime, isUuid, ok, orNull, PUBLISH_TZ, slugify, statusOf, str, zonedToUtcISO } from "../form";
import { revalidateTags } from "../revalidate";
import { insertSql, ts, updateSql } from "../sql";
import type { ActionState } from "../types";

const publishAt = (fd: FormData) => {
  const v = str(fd, "publish_at");
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? zonedToUtcISO(v, PUBLISH_TZ) : null;
};

export async function savePost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);

  const id = str(fd, "id");
  if (id && !isUuid(id)) return fail("Invalid post.");
  const title = str(fd, "title");
  if (!title) return fail("Title is required.");
  const status = statusOf(fd);
  const cover = str(fd, "cover_id");
  const member = str(fd, "member_id");
  const names = [...new Set(str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12);
  const at = publishAt(fd);

  try {
    const prev = id ? await queryOne<{ slug: string; published_at: string | null }>(`select slug, ${ts("published_at")} from posts where id = $1`, [id]) : null;
    const published_at = status === "published" ? at ?? prev?.published_at ?? new Date().toISOString() : at ?? prev?.published_at ?? null;
    const row = {
      slug: slugify(str(fd, "slug")) || slugify(title) || fallbackSlug("post"),
      title,
      excerpt: orNull(fd, "excerpt"),
      body_md: str(fd, "body_md"),
      cover_id: isUuid(cover) ? cover : null,
      member_id: isUuid(member) ? member : null,
      status,
      published_at,
      updated_by: g.userId,
    };

    const saved = await withActor(g.userId, async (q) => {
      const { text, params } = id ? updateSql("posts", row, id, "id, slug") : insertSql("posts", { ...row, source: "human" }, "id, slug");
      const [p] = await q<{ id: string; slug: string }>(text, params);
      if (!p) throw new Error("That post no longer exists.");
      // Tags: names → tags (upsert by slug) → post_tags.
      await q(`delete from post_tags where post_id = $1`, [p.id]);
      for (const name of names) {
        const [t] = await q<{ id: string }>(
          `insert into tags (slug, name) values ($1, $2) on conflict (slug) do update set name = tags.name returning id`,
          [slugify(name) || fallbackSlug("tag"), name],
        );
        await q(`insert into post_tags (post_id, tag_id) values ($1, $2) on conflict do nothing`, [p.id, t.id]);
      }
      return p;
    });

    revalidateTags(["home", "posts", `post:${saved.slug}`, prev && prev.slug !== saved.slug ? `post:${prev.slug}` : null]);
    const verb = status === "published" ? (published_at && Date.parse(published_at) > Date.now() ? "scheduled" : "published") : status === "archived" ? "archived" : "saved as draft";
    return ok(`${title} ${verb}`, `/admin/posts?id=${saved.id}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

/** Review panel: approve & schedule/publish, reject (archive), or move back to drafts, without touching the content. */
export async function setPostState(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing selected.");
  const status = statusOf(fd);
  try {
    const prev = await queryOne<{ slug: string; published_at: string | null }>(`select slug, ${ts("published_at")} from posts where id = $1`, [id]);
    if (!prev) return fail("That post no longer exists.");
    const when = status === "published" ? publishAt(fd) ?? prev.published_at ?? new Date().toISOString() : prev.published_at;
    await withActor(g.userId, (q) => q(`update posts set status = $1, published_at = $2, updated_by = $3, updated_at = now() where id = $4`, [status, when, g.userId, id]));
    revalidateTags(["home", "posts", `post:${prev.slug}`]);
    const msg = status === "published"
      ? when && Date.parse(when) > Date.now() ? `Approved · scheduled for ${fmtDateTime(when)}` : "Approved · live on the site"
      : status === "archived" ? "Draft rejected" : "Moved back to drafts";
    return ok(msg, `/admin/posts?id=${id}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deletePost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing to delete.");
  try {
    const [p] = await withActor(g.userId, (q) => q<{ slug: string }>(`delete from posts where id = $1 returning slug`, [id]));
    revalidateTags(["home", "posts", p ? `post:${p.slug}` : null]);
    return ok("Post deleted", "/admin/posts");
  } catch (e) {
    return fail(dbError(e));
  }
}
