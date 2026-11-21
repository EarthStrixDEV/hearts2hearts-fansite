"use server";

import { queryOne, withActor } from "@/lib/neon/db";
import { gate } from "../auth";
import { csv, dbError, fail, fallbackSlug, isHex, isUuid, num, ok, orNull, slugify, statusOf, str } from "../form";
import { revalidateTags } from "../revalidate";
import { insertSql, updateSql } from "../sql";
import type { ActionState } from "../types";

/** "Label: value" per line → member_facts rows. A line without a colon becomes a "Fun fact". */
function parseFacts(text: string) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const m = /^([^:：]{1,60})[:：]\s*(.+)$/.exec(line);
    return m ? { label: m[1].trim(), value: m[2].trim(), sort_order: i } : { label: "Fun fact", value: line, sort_order: i };
  });
}

export async function saveMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);

  const id = str(fd, "id");
  if (id && !isUuid(id)) return fail("Invalid member.");
  const stage = str(fd, "stage_name");
  if (!stage) return fail("Stage name is required.");
  const birth = str(fd, "birth_date");
  if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return fail("Birthday must be a valid date.");
  const color = str(fd, "color_hex");
  const avatar = str(fd, "avatar_id");
  const cover = str(fd, "cover_id");
  const position = csv(fd, "position");

  const row = {
    slug: slugify(str(fd, "slug")) || slugify(stage) || fallbackSlug("member"),
    stage_name: stage,
    name_ko: orNull(fd, "name_ko"),
    real_name: orNull(fd, "real_name"),
    birth_date: birth || null,
    position: position.length ? position : null,
    color_hex: isHex(color) ? color : "#F9A8D4",
    bio: orNull(fd, "bio"),
    avatar_id: isUuid(avatar) ? avatar : null,
    cover_id: isUuid(cover) ? cover : null,
    sort_order: num(fd, "sort_order", 0),
    status: statusOf(fd),
    updated_by: g.userId,
  };
  const facts = parseFacts(str(fd, "facts"));

  try {
    const oldSlug = id ? (await queryOne<{ slug: string }>(`select slug from members where id = $1`, [id]))?.slug ?? null : null;
    const saved = await withActor(g.userId, async (q) => {
      const { text, params } = id ? updateSql("members", row, id, "id, slug") : insertSql("members", row, "id, slug");
      const [m] = await q<{ id: string; slug: string }>(text, params);
      if (!m) throw new Error("That member no longer exists.");
      await q(`delete from member_facts where member_id = $1`, [m.id]); // facts are edited as one block
      for (const f of facts) await q(`insert into member_facts (member_id, label, value, sort_order) values ($1, $2, $3, $4)`, [m.id, f.label, f.value, f.sort_order]);
      return m;
    });
    revalidateTags(["home", "members", `member:${saved.slug}`, oldSlug && oldSlug !== saved.slug ? `member:${oldSlug}` : null]);
    const verb = row.status === "published" ? "published" : row.status === "archived" ? "archived" : "saved as draft";
    return ok(`${stage} ${verb}`, `/admin/members?id=${saved.id}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing to delete.");
  try {
    const [m] = await withActor(g.userId, (q) => q<{ slug: string; stage_name: string }>(`delete from members where id = $1 returning slug, stage_name`, [id]));
    revalidateTags(["home", "members", m ? `member:${m.slug}` : null]);
    return ok(`${m?.stage_name ?? "Member"} deleted`, "/admin/members");
  } catch (e) {
    return fail(dbError(e));
  }
}
