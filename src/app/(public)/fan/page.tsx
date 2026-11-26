import type { Metadata } from "next";
import { FanHub, type FanHubProps } from "@/components/fan/FanHub";
import { safeHex, type ThemeMember, type ThemeState } from "@/components/fan/theme";
import { getFandom, getFanEras, getNextCountdown, getOrCreateFanMe } from "@/lib/db/fan";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";
import { getMembers } from "@/lib/db/members";
import { dayNumberSince, formatZoned, ICT, KST } from "@/lib/fan/time";
import { saveFanTheme } from "./actions";

export const metadata: Metadata = { title: "S2U hub" };
// Rendered per request: the countdown needs the server's current time, and the welcome bar is personal.
// The data behind it (members, eras, countdown, settings) is cached by tag.
export const dynamic = "force-dynamic";

async function loadHub(): Promise<Omit<FanHubProps, "saveTheme">> {
  const [members, eras, countdown, fandom] = await Promise.all([getMembers(), getFanEras(), getNextCountdown(), getFandom()]);
  const now = Date.now();

  let me: FanHubProps["me"] = null;
  let initialTheme: ThemeState = { mode: "era", biasId: null, eraId: null };
  if (hasFanDb()) {
    try {
      const userId = await getSessionUserId();
      if (userId) {
        const f = await getOrCreateFanMe(userId);
        me = { nickname: f.nickname, day: dayNumberSince(f.joinedAt, now) };
        initialTheme = { mode: f.themeMode, biasId: f.biasMemberId, eraId: f.eraAlbumId };
      }
    } catch (e) {
      // signed out, auth not configured, or the personal query failed: the hub still works as a guest
      console.error("fan hub: personal data unavailable", e);
    }
  }

  const themeMembers: ThemeMember[] = members.map((m) => ({
    id: m.id,
    name: m.stage_name,
    ko: m.name_ko,
    color: safeHex(m.color_hex, "#F9A8D4"),
    photo: m.photos?.avatar ?? null,
  }));

  return {
    fandomName: fandom.name,
    me,
    members: themeMembers,
    eras,
    initialTheme,
    countdown,
    whenText: countdown ? `${formatZoned(countdown.targetAt, KST)} KST, which is ${formatZoned(countdown.targetAt, ICT)} in Thailand (ICT).` : null,
    serverNow: now,
    wrappedYear: new Date(now).getUTCFullYear(),
  };
}

export default async function FanPage() {
  return <FanHub {...await loadHub()} saveTheme={saveFanTheme} />;
}
