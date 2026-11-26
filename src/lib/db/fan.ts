import { unstable_cache } from "next/cache";
import { z } from "zod";
import { formatDay } from "@/lib/fan/time";
import { hasFanDb, withUser } from "./fan-client";
import type { FandomSetting } from "./fan-types";
import { SEED_COUNTDOWN, SEED_ERAS, SEED_ERA_COLORS, SEED_FANDOM } from "./seed/fan";

// Public fan data. Reads run through withUser(null) on `fan_app`, so RLS (published only) applies; personal reads and writes
// take the signed-in user id from getSessionUserId(). Without DATABASE_URL_APP everything falls back to seed data.

const REVALIDATE = 3600;
const HEX = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FanEra { id: string; title: string; sub: string; from: string; to: string }
export interface FanTeaser { label: string; unlockAt: string | null }
export interface FanCountdown { id: string; title: string; kind: "comeback" | "anniversary" | "release"; targetAt: string; teasers: FanTeaser[] }
export type ThemeMode = "bias" | "era";
export interface FanMe { nickname: string; themeMode: ThemeMode; biasMemberId: string | null; eraAlbumId: string | null; joinedAt: string }

const Fandom = z.object({ name: z.string().min(1), name_native: z.string(), color: z.string().regex(HEX), debut_date: z.string() });
const Teasers = z.array(z.object({ label: z.string(), unlock_at: z.string().nullable().optional() }));

/** site_settings.fandom (name, color, debut date). Cache tag `settings`. */
export const getFandom = unstable_cache(
  async (): Promise<FandomSetting> => {
    if (!hasFanDb()) return SEED_FANDOM;
    const rows = await withUser(null, (q) => q<{ value: unknown }>("select value from site_settings where key = 'fandom'"));
    const parsed = Fandom.safeParse(rows[0]?.value);
    return parsed.success ? parsed.data : SEED_FANDOM;
  },
  ["fan:fandom"],
  { tags: ["settings"], revalidate: REVALIDATE },
);

const TYPE = { single: "Single", ep: "EP", album: "Album" } as const;
const pair = (from: string | null, to: string | null, i: number): [string, string] =>
  from && to && HEX.test(from) && HEX.test(to) ? [from, to] : SEED_ERA_COLORS[i % SEED_ERA_COLORS.length];

/** Published releases oldest first, with their era colors (albums.theme_from/theme_to, palette fallback). Cache tag `music`. */
export const getFanEras = unstable_cache(
  async (): Promise<FanEra[]> => {
    const rows = hasFanDb()
      ? await withUser(null, (q) =>
          q<{ id: string; title: string; album_type: keyof typeof TYPE; release_date: string; theme_from: string | null; theme_to: string | null }>(
            `select id, title, album_type, release_date::text as release_date, theme_from, theme_to
               from albums where status = 'published' and release_date is not null order by release_date, title`,
          ),
        )
      : SEED_ERAS.map((e) => ({ id: e.id, title: e.title, album_type: e.albumType, release_date: e.releaseDate, theme_from: null, theme_to: null }));
    return rows.map((r, i) => {
      const [from, to] = pair(r.theme_from, r.theme_to, i);
      return { id: r.id, title: r.title, sub: `${TYPE[r.album_type]} · ${formatDay(r.release_date)}`, from, to };
    });
  },
  ["fan:eras"],
  { tags: ["music"], revalidate: REVALIDATE },
);

/** The next published countdown that is still in the future, or null. Short revalidate so an expired one drops out. Cache tag `fan:countdown`. */
export const getNextCountdown = unstable_cache(
  async (): Promise<FanCountdown | null> => {
    if (!hasFanDb()) return Date.parse(SEED_COUNTDOWN.targetAt) > Date.now() ? SEED_COUNTDOWN : null;
    const rows = await withUser(null, (q) =>
      q<{ id: string; title: string; kind: FanCountdown["kind"]; target_at: string; teasers: unknown }>(
        `select id, title, kind, to_json(target_at) #>> '{}' as target_at, teasers
           from countdowns where status = 'published' and target_at > now() order by target_at limit 1`,
      ),
    );
    const r = rows[0];
    if (!r) return null;
    const t = Teasers.safeParse(r.teasers);
    return {
      id: r.id,
      title: r.title,
      kind: r.kind,
      targetAt: r.target_at,
      teasers: t.success ? t.data.map((x) => ({ label: x.label, unlockAt: x.unlock_at ?? null })) : [],
    };
  },
  ["fan:countdown"],
  { tags: ["fan:countdown"], revalidate: 60 },
);

/** One published countdown by id (guests allowed, RLS filters drafts). Used by the .ics route. */
export async function getCountdownById(id: string): Promise<{ id: string; title: string; targetAt: string } | null> {
  if (!hasFanDb()) return id === SEED_COUNTDOWN.id ? SEED_COUNTDOWN : null;
  if (!UUID.test(id)) return null;
  const rows = await withUser(null, (q) =>
    q<{ id: string; title: string; target_at: string }>("select id, title, to_json(target_at) #>> '{}' as target_at from countdowns where id = $1", [id]),
  );
  return rows[0] ? { id: rows[0].id, title: rows[0].title, targetAt: rows[0].target_at } : null;
}

/**
 * The fan's profile, created on first visit (nickname defaults to the account's display name).
 * Also logs the daily login (app.log_fan_activity is idempotent per Thai day), so every login-required fan page that loads
 * the profile counts as that day's visit.
 */
export async function getOrCreateFanMe(userId: string): Promise<FanMe> {
  return withUser(userId, async (q) => {
    await q(
      `insert into fan_profiles (user_id, nickname)
       values ($1, coalesce(nullif(btrim((select display_name from profiles where id = $1)), ''), 'S2U fan'))
       on conflict (user_id) do nothing`,
      [userId],
    );
    const [r] = await q<{ nickname: string; theme_mode: ThemeMode; bias_member_id: string | null; era_album_id: string | null; joined_fandom_at: string }>(
      "select nickname, theme_mode, bias_member_id, era_album_id, joined_fandom_at::text as joined_fandom_at from fan_profiles where user_id = $1",
      [userId],
    );
    await q("select app.log_fan_activity('login')");
    return { nickname: r.nickname, themeMode: r.theme_mode, biasMemberId: r.bias_member_id, eraAlbumId: r.era_album_id, joinedAt: r.joined_fandom_at };
  });
}

/** Saves the chosen theme. The member / era not being changed keeps its stored value. */
export async function saveFanTheme(userId: string, t: { mode: ThemeMode; biasMemberId: string | null; eraAlbumId: string | null }): Promise<void> {
  await withUser(userId, (q) =>
    q(
      `insert into fan_profiles (user_id, nickname, theme_mode, bias_member_id, era_album_id)
       values ($1, coalesce(nullif(btrim((select display_name from profiles where id = $1)), ''), 'S2U fan'), $2, $3, $4)
       on conflict (user_id) do update set
         theme_mode = excluded.theme_mode,
         bias_member_id = coalesce(excluded.bias_member_id, fan_profiles.bias_member_id),
         era_album_id = coalesce(excluded.era_album_id, fan_profiles.era_album_id)`,
      [userId, t.mode, t.biasMemberId, t.eraAlbumId],
    ),
  );
}
