import { unstable_cache } from "next/cache";
import { hasDb, queryOne } from "@/lib/neon/db";
import { getMembers } from "./members";
import { SEED_ABOUT } from "./seed/pages";
import type { Page } from "./types";

export interface AboutInfoRow { key: string; label: string; value: string; sub?: string; muted?: boolean }
export interface AboutContent {
  title: string;
  nameStory: string;
  info: AboutInfoRow[];
  story: { when: string; title: string; body: string; dot: string }[];
  links: { name: string; handle: string; href: string; icon: string; bg: string }[];
  siteParagraphs: string[];
  builtWith: { label: string; bg: string }[];
  disclaimer: string;
}

/** A published row of the `pages` table by slug (cache tag `pages`), or null (also when there is no DB). */
export const getPage = (slug: string): Promise<Pick<Page, "title" | "body_md"> | null> =>
  unstable_cache(
    async () => {
      if (!hasDb()) return null;
      return queryOne<Pick<Page, "title" | "body_md">>(
        "select title, body_md from pages where slug = $1 and status = 'published'",
        [slug],
      );
    },
    ["page", slug],
    { tags: ["pages"], revalidate: 3600 },
  )();

/**
 * About page content. Structure (info, story, links) comes from the seed; the `pages` row (slug "about"),
 * when present, overrides the "About this site" copy (blank-line separated paragraphs). The Members row is live.
 */
export async function getAboutContent(): Promise<AboutContent> {
  const [page, members] = await Promise.all([getPage("about"), getMembers()]);
  const paragraphs = page?.body_md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return {
    ...SEED_ABOUT,
    info: SEED_ABOUT.info.map((r) =>
      r.key === "members" ? { ...r, value: String(members.length), sub: members.map((m) => m.stage_name).join(", ") } : r,
    ),
    siteParagraphs: paragraphs?.length ? paragraphs : SEED_ABOUT.siteParagraphs,
  };
}
