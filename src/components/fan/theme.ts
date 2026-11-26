// Bias / era theming for /fan. Pure functions so the rules can be tested without React.
import type { FanEra, ThemeMode } from "@/lib/db/fan";

export interface ThemeMember { id: string; name: string; ko: string | null; color: string; photo: string | null }
export interface ThemeState { mode: ThemeMode; biasId: string | null; eraId: string | null }
export interface ResolvedTheme {
  /** The era shown on the shelf ("Now showing"). */
  era: FanEra;
  /** Selected bias member, only while mode is "bias". */
  bias: ThemeMember | null;
  accent: string;
  pageTint: string;
  heroFrom: string;
  heroTo: string;
  label: string;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const safeHex = (c: string | null | undefined, fallback: string) => (c && HEX.test(c) ? c : fallback);

/** Used only when the site has no published release yet. */
export const FALLBACK_ERA: FanEra = { id: "none", title: "S2U", sub: "", from: "#DDF0FF", to: "#A8D8FF" };

export function resolveTheme(state: ThemeState, members: ThemeMember[], eras: FanEra[]): ResolvedTheme {
  const era = eras.find((e) => e.id === state.eraId) ?? eras[eras.length - 1] ?? FALLBACK_ERA;
  const bias = state.mode === "bias" ? members.find((m) => m.id === state.biasId) ?? null : null;
  return {
    era,
    bias,
    accent: bias ? bias.color : era.to,
    pageTint: bias ? `${bias.color}66` : era.from,
    heroFrom: bias ? bias.color : era.from,
    heroTo: era.to,
    label: bias ? `${bias.name}’s color` : `${era.title} era`,
  };
}

/** Guest choice from localStorage. Anything that is not a known member / era is dropped. */
export function parseStoredTheme(raw: string | null, members: ThemeMember[], eras: FanEra[]): ThemeState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ThemeState> | null;
    if (!v || (v.mode !== "bias" && v.mode !== "era")) return null;
    return {
      mode: v.mode,
      biasId: members.some((m) => m.id === v.biasId) ? (v.biasId as string) : null,
      eraId: eras.some((e) => e.id === v.eraId) ? (v.eraId as string) : null,
    };
  } catch {
    return null;
  }
}
