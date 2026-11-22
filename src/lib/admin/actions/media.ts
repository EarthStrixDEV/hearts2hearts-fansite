"use server";

import { withActor } from "@/lib/neon/db";
import { isRemoteImageUrl, normalizeXImageUrl, xImageMime } from "@/lib/media-url";
import { hasStorage, storage } from "@/lib/neon/storage";
import { gate } from "../auth";
import { dbError, fail, isUuid, ok, orNull, str } from "../form";
import { revalidateTags } from "../revalidate";
import type { ActionState } from "../types";

export async function updateMedia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing selected.");
  const alt = str(fd, "alt");
  if (str(fd, "require_alt") === "1" && !alt) return fail("Alt text is required for images.");
  try {
    await withActor(g.userId, (q) => q(`update media set alt = $1, credit = $2 where id = $3`, [alt || null, orNull(fd, "credit"), id]));
    revalidateTags(["home", "members", "music", "posts", "events"]); // pages render alt text from media
    return ok("Saved", `/admin/media?id=${id}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteMedia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing selected.");
  try {
    // FKs from content tables block the delete while the file is in use (23503).
    const [m] = await withActor(g.userId, (q) => q<{ path: string }>(`delete from media where id = $1 returning path`, [id]));
    if (m?.path && !isRemoteImageUrl(m.path) && hasStorage()) await storage().delete(m.path).catch(() => undefined);
    revalidateTags(["home", "members", "music", "posts", "events"]);
    return ok("File deleted", "/admin/media");
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    return fail(code === "23503" ? "This file is still used on a page. Take it off first." : dbError(e));
  }
}

const MAX_X_IMAGES = 40;

/**
 * Registers images that live on X's CDN (pbs.twimg.com) without copying them: media.path holds the canonical URL.
 * One link per line/space. Anything that is not an X image link is rejected (also enforced by media_path_shape in the DB).
 */
export async function addXImages(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const raw = str(fd, "urls").split(/\s+/).filter(Boolean);
  if (!raw.length) return fail("Paste at least one image link.");
  if (raw.length > MAX_X_IMAGES) return fail(`Add up to ${MAX_X_IMAGES} links at a time.`);
  const good = new Map<string, string>();
  const bad: string[] = [];
  for (const r of raw) {
    const u = normalizeXImageUrl(r);
    if (u) good.set(u, r);
    else bad.push(r);
  }
  if (bad.length) return fail(`Not an X image link (expected https://pbs.twimg.com/media/…): ${bad[0].slice(0, 80)}${bad.length > 1 ? ` and ${bad.length - 1} more` : ""}`);
  const alt = orNull(fd, "alt");
  const credit = orNull(fd, "credit");
  try {
    const added = await withActor(g.userId, async (q) => {
      let n = 0;
      for (const url of good.keys()) {
        const rows = await q(
          `insert into media (path, mime_type, alt, credit, uploaded_by) values ($1, $2, $3, $4, $5)
           on conflict (path) do nothing returning id`,
          [url, xImageMime(url), alt, credit, g.userId],
        );
        n += rows.length;
      }
      return n;
    });
    const dup = good.size - added;
    return ok(`Added ${added} image${added === 1 ? "" : "s"}${dup ? ` (${dup} already in the library)` : ""}`, "/admin/media");
  } catch (e) {
    return fail(dbError(e));
  }
}
