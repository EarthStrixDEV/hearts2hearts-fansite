"use server";

import { withActor } from "@/lib/neon/db";
import { gate } from "../auth";
import { dbError, fail, isUuid, num, ok, orNull, statusOf, str } from "../form";
import { revalidateTags } from "../revalidate";
import { insertSql, updateSql } from "../sql";
import type { ActionState } from "../types";

/** Home hero slide: a library image + the era name and one-line subtitle shown on the carousel. */
export async function saveSlide(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (id && !isUuid(id)) return fail("Invalid slide.");
  const image = str(fd, "image_id");
  if (!isUuid(image)) return fail("Pick an image from the library first.");
  const row = {
    image_id: image,
    headline: orNull(fd, "headline"),
    subline: orNull(fd, "subline"),
    sort_order: num(fd, "sort_order", 0),
    status: statusOf(fd),
  };
  try {
    const saved = await withActor(g.userId, async (q) => {
      const { text, params } = id ? updateSql("hero_slides", row, id, "id", false) : insertSql("hero_slides", row, "id");
      const [r] = await q<{ id: string }>(text, params);
      if (!r) throw new Error("That slide no longer exists.");
      return r;
    });
    revalidateTags(["home"]);
    const verb = row.status === "published" ? "published" : row.status === "archived" ? "archived" : "saved as draft";
    return ok(`Slide ${verb}`, `/admin/home?id=${saved.id}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteSlide(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing to delete.");
  try {
    await withActor(g.userId, (q) => q(`delete from hero_slides where id = $1`, [id]));
    revalidateTags(["home"]);
    return ok("Slide deleted", "/admin/home");
  } catch (e) {
    return fail(dbError(e));
  }
}
