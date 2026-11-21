"use server";

import { withActor } from "@/lib/neon/db";
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
    if (m?.path && hasStorage()) await storage().delete(m.path).catch(() => undefined);
    revalidateTags(["home", "members", "music", "posts", "events"]);
    return ok("File deleted", "/admin/media");
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    return fail(code === "23503" ? "This file is still used on a page. Take it off first." : dbError(e));
  }
}
