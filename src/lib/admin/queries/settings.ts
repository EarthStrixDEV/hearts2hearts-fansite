import "server-only";
import type { Profile } from "@/lib/db/types";
import { query, hasDb } from "@/lib/neon/db";
import { ts } from "../sql";

export interface AdminSettings {
  site_name: string;
  tagline: string;
  disclaimer: string;
  social_links: { label: string; href: string }[];
  ai_enabled: boolean;
  ai_time: string;
  ai_model: string;
  ai_prompt: string;
}

// Same defaults as src/lib/db/settings.ts for the keys the public site reads, plus the AI + disclaimer keys.
export const SETTINGS_DEFAULTS: AdminSettings = {
  site_name: "H2H·S2U",
  tagline: "An unofficial, fan-made home for Hearts2Hearts and S2U.",
  disclaimer: "Unofficial fan site. Not affiliated with SM Entertainment. Hearts2Hearts names, images and music belong to SM Entertainment and their respective owners.",
  social_links: [
    { label: "Instagram", href: "https://www.instagram.com/hearts2hearts" },
    { label: "X", href: "https://x.com/Hearts2Hearts" },
    { label: "YouTube", href: "https://www.youtube.com/@hearts2hearts.official" },
    { label: "TikTok", href: "https://www.tiktok.com/@hearts2hearts" },
  ],
  ai_enabled: true,
  ai_time: "09:00",
  ai_model: "",
  ai_prompt: "",
};

/** Admin-only (includes ai_prompt). Callers must be gated to the admin role. */
export async function getAdminSettings(): Promise<AdminSettings> {
  if (!hasDb()) return SETTINGS_DEFAULTS;
  const rows = await query<{ key: string; value: unknown }>(`select key, value from site_settings where key = any($1::text[])`, [Object.keys(SETTINGS_DEFAULTS)]);
  const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out as unknown as AdminSettings;
}

export async function listProfiles(): Promise<Profile[]> {
  if (!hasDb()) return [];
  return query<Profile>(`select id, display_name, avatar_url, role, is_banned, ${ts("created_at")} from profiles where role in ('admin','editor') order by created_at`);
}
