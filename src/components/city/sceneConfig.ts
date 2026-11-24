/** Heart Town scene config: one typed object for tier, moods (day/night) and camera. Colours come from the design. */

export type CityTier = "low" | "high";

export interface CityMood {
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  keyColor: string;
  key: number;
  env: number;
  ground: string;
  /** sides of the ground slab */
  slab: string;
  road: string;
  /** emissive strength of windows, lamp bulbs and marquee bulbs (0 = off) */
  glow: number;
  cloudOpacity: number;
}

export interface CitySceneConfig {
  tier: CityTier;
  dpr: [number, number];
  shadowMap: number;
  exposure: number;
  /** camera distance along the (1,1,1) isometric diagonal */
  camDistance: number;
  day: CityMood;
  night: CityMood;
  glowColor: string;
  ink: string;
}

const base = {
  exposure: 1,
  camDistance: 24,
  glowColor: "#FFE38A",
  ink: "#2B2440",
  day: {
    hemiSky: "#EEE8FF", hemiGround: "#FFE3F1", hemi: 0.75,
    keyColor: "#FFF4EA", key: 2.0, env: 0.4,
    ground: "#E3F5E9", slab: "#BFE3CC", road: "#FFFFFF", glow: 0, cloudOpacity: 0.95,
  },
  night: {
    hemiSky: "#B4A6E6", hemiGround: "#4A3F70", hemi: 1.0,
    keyColor: "#B9C8FF", key: 0.55, env: 0.18,
    ground: "#9FC0AD", slab: "#7FA591", road: "#C9C0E6", glow: 1.0, cloudOpacity: 0.12,
  },
} satisfies Omit<CitySceneConfig, "tier" | "dpr" | "shadowMap">;

export function cityConfig(tier: CityTier): CitySceneConfig {
  return tier === "low" ? { ...base, tier, dpr: [1, 1.5], shadowMap: 1024 } : { ...base, tier, dpr: [1, 2], shadowMap: 2048 };
}

/** Phones and touch-first devices get the low tier. Client only. */
export const detectTier = (): CityTier =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 760px), (pointer: coarse)").matches ? "low" : "high";
