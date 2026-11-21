import { hasDb, query } from "@/lib/neon/db";

export interface SiteSettings {
  site_name: string;
  tagline: string;
  social_links: { label: string; href: string }[];
}

// Used when the database is not configured/seeded, and as per-key fallback. Values from design/project/Main.dc.html footer.
const DEFAULTS: SiteSettings = {
  site_name: "H2H·S2U",
  tagline: "An unofficial, fan-made home for Hearts2Hearts and S2U.",
  social_links: [
    { label: "Instagram", href: "https://www.instagram.com/hearts2hearts" },
    { label: "X", href: "https://x.com/Hearts2Hearts" },
    { label: "YouTube", href: "https://www.youtube.com/@hearts2hearts.official" },
    { label: "TikTok", href: "https://www.tiktok.com/@hearts2hearts" },
  ],
};

/** Reads site_settings (cache tag `settings`). Falls back to DEFAULTS per key. */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!hasDb()) return DEFAULTS;
  const rows = await query<{ key: string; value: unknown }>("select key, value from site_settings where key = any($1)", [
    Object.keys(DEFAULTS),
  ]);
  const out: SiteSettings = { ...DEFAULTS };
  for (const r of rows) (out as unknown as Record<string, unknown>)[r.key] = r.value;
  return out;
}
