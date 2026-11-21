"use server";

import { withActor } from "@/lib/neon/db";
import { gate } from "../auth";
import { dbError, fail, flag, isUrl, ok, str } from "../form";
import { revalidateTags } from "../revalidate";
import type { ActionState } from "../types";

/** One "Label | https://url" per line. */
function parseLinks(text: string): { label: string; href: string }[] | string {
  const out: { label: string; href: string }[] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const [label, href] = line.split("|").map((s) => s.trim());
    if (!label || !href || !isUrl(href)) return `Social link "${line}" must look like: Label | https://…`;
    out.push({ label, href });
  }
  return out;
}

/** Admin only: includes the AI prompt (key `ai_prompt`). */
export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("admin");
  if (!g.ok) return fail(g.message);

  const disclaimer = str(fd, "disclaimer");
  if (!/unofficial/i.test(disclaimer)) return fail('The disclaimer must say the site is "unofficial".');
  const links = parseLinks(str(fd, "social_links"));
  if (typeof links === "string") return fail(links);
  const time = str(fd, "ai_time");
  if (!/^\d{2}:\d{2}$/.test(time)) return fail("AI run time must look like 09:00.");

  const values: Record<string, unknown> = {
    site_name: str(fd, "site_name") || "H2H·S2U",
    tagline: str(fd, "tagline"),
    disclaimer,
    social_links: links,
    ai_enabled: flag(fd, "ai_enabled"),
    ai_time: time,
    ai_model: str(fd, "ai_model"),
    ai_prompt: str(fd, "ai_prompt"),
  };
  try {
    await withActor(g.userId, async (q) => {
      for (const [key, value] of Object.entries(values)) {
        await q(
          `insert into site_settings (key, value, updated_at) values ($1, $2::jsonb, now())
           on conflict (key) do update set value = excluded.value, updated_at = now()`,
          [key, JSON.stringify(value)],
        );
      }
    });
    revalidateTags(["settings", "home", "pages"]);
    return ok("Settings saved", "/admin/settings");
  } catch (e) {
    return fail(dbError(e));
  }
}
