// Seed = SPOTS + BL (building layout) from design/project/City.dc.html, re-laid-out for the 3D diorama
// (eight member houses, a fountain plaza at the crossroads, a small park; the café moved to the front-left corner so it no longer hides the houses). City-grid units: ground is 10x10 on x/z.
import type { CitySpot } from "../types";

/** Which building model a spot renders as. DB rows map to a kind through their link (see kindForHref). */
export type SpotKind = "music" | "hall" | "school" | "cafe" | "houses" | "generic";

/** Ground rectangle a spot's building occupies (x/z = min corner). */
export interface CityLot { x: number; z: number; w: number; d: number }

export interface CitySpotView {
  id: string;
  name: string;
  description: string;
  href: string;
  dot: string;
  kind: SpotKind;
  lot: CityLot;
  /** body height (roof decorations sit on top) */
  h: number;
  /** design shades: [top, right(+x face), left(+z face)] */
  colors: [string, string, string];
  /** centre of the lot on the ground plane, used for the fly-to camera */
  pos: [number, number, number];
}

/** One member house in the Member Houses spot. */
export interface CityHouse { name: string; color: string }

const pink: [string, string, string] = ["#FFD0E2", "#FFB6D3", "#FF9EC3"];
const lilac: [string, string, string] = ["#E4DAFF", "#CFC0FF", "#B9A3F5"];
const sky: [string, string, string] = ["#D6ECFF", "#B3D9FA", "#8FC4F2"];
const peach: [string, string, string] = ["#FFE6D2", "#FFD0AE", "#F5B98F"];
const cream: [string, string, string] = ["#FFF6EE", "#FFF0E6", "#EED7CB"];

/** Footprint, height and shades used when a spot only has a position (DB rows). */
export const KIND_DEFAULTS: Record<SpotKind, { w: number; d: number; h: number; colors: [string, string, string]; dot: string }> = {
  music: { w: 2, d: 2, h: 2.2, colors: pink, dot: "#FF8FB8" },
  hall: { w: 3.2, d: 2.2, h: 2.6, colors: lilac, dot: "#B9A3F5" },
  school: { w: 2, d: 2.4, h: 2.2, colors: sky, dot: "#8FC4F2" },
  cafe: { w: 2, d: 2, h: 1.6, colors: peach, dot: "#F5B98F" },
  houses: { w: 4.4, d: 1.8, h: 0.7, colors: cream, dot: "#FFD25E" },
  generic: { w: 1.6, d: 1.6, h: 1.8, colors: pink, dot: "#FF8FB8" },
};

const KIND_BY_PATH: Record<string, SpotKind> = { "/music": "music", "/schedule": "hall", "/game": "school", "/blog": "cafe", "/members": "houses" };
export const kindForHref = (href: string): SpotKind => KIND_BY_PATH[href.replace(/[?#].*$/, "").replace(/\/+$/, "")] ?? "generic";

export function spotView(s: { id: string; name: string; description: string; href: string; kind: SpotKind; x: number; z: number; dot?: string }): CitySpotView {
  const k = KIND_DEFAULTS[s.kind];
  const lot = { x: s.x, z: s.z, w: k.w, d: k.d };
  return { id: s.id, name: s.name, description: s.description, href: s.href, kind: s.kind, dot: s.dot ?? k.dot, lot, h: k.h, colors: k.colors, pos: [lot.x + lot.w / 2, 0, lot.z + lot.d / 2] };
}

export const SEED_CITY_SPOTS: CitySpotView[] = [
  spotView({ id: "music", name: "Music Store", href: "/music", kind: "music", x: 1, z: 1, description: "The discography, popular tracks, music videos and the player all live here." }),
  spotView({ id: "hall", name: "Concert Hall", href: "/schedule", kind: "hall", x: 5.6, z: 0.6, description: "Concerts, fan meetings and music shows, with a countdown to the next one." }),
  spotView({ id: "school", name: "School", href: "/game", kind: "school", x: 1, z: 5, description: "Test what you know: quiz, memory match and more mini games." }),
  spotView({ id: "cafe", name: "Café", href: "/blog", kind: "cafe", x: 0.9, z: 7.9, description: "Grab a drink and read today’s AI-written fan note." }),
  spotView({ id: "houses", name: "Member Houses", href: "/members", kind: "houses", x: 4.4, z: 4.25, description: "Eight little houses, one for each member. Visit their profiles." }),
];

type V2 = [number, number];
type V3 = [number, number, number];

/** Decorative scene content: ground, roads, plaza, greenery, lamps, walkers, floating hearts, clouds. */
export const CITY_SCENE = {
  size: 10,
  roads: [
    { x: 0, z: 3.3, w: 10, d: 0.5 },
    { x: 3.3, z: 0, w: 0.5, d: 10 },
  ],
  /** heart fountain plaza where the roads cross */
  plaza: { x: 3.55, z: 3.55, r: 0.72 },
  trees: [
    [0.45, 0.5, 1], [0.45, 4.45, 0.9], [2.6, 4.45, 0.8], [9.5, 0.5, 1], [9.45, 2.9, 0.85], [9.5, 5.2, 1.05], [9.5, 6.4, 0.8],
    [4.7, 7.3, 1.1], [5.8, 8.1, 0.9], [4.8, 9.1, 0.8], [6.9, 7.0, 1], [8.1, 7.5, 1.15], [7.0, 8.6, 0.9], [8.7, 8.6, 1],
    [7.4, 9.4, 0.85], [9.4, 9.3, 1],
  ] as V3[],
  /** flower bushes: x, z, scale, colour index (flower palette) */
  flowers: [
    [5.1, 6.6, 1, 0], [7.6, 8.1, 0.9, 1], [8.4, 6.75, 1.1, 2], [9.0, 7.9, 0.8, 0], [6.75, 9.5, 0.9, 3], [4.6, 9.65, 0.9, 1], [0.35, 7.2, 1, 1],
    [0.35, 5.6, 0.9, 2], [2.6, 0.4, 1, 3], [1.4, 0.4, 0.8, 0], [9.6, 8.1, 1, 2], [9.6, 4.4, 0.8, 0], [8.4, 9.65, 0.9, 1],
    [3.0, 6.0, 0.8, 3], [0.4, 3.0, 0.9, 0], [9.6, 1.6, 0.8, 1],
  ] as [number, number, number, number][],
  flowerColors: ["#FF8FB8", "#C9B6FF", "#FFD25E", "#A8D8FF"],
  lamps: [[1.2, 3.12], [5.2, 3.12], [8.9, 3.98], [2.2, 3.98], [3.12, 1.4], [3.98, 6.4], [3.12, 8.7], [3.98, 9.4]] as V2[],
  walkers: [
    { from: [4.5, 3.55] as V2, to: [9.6, 3.55] as V2, color: "#FF8FB8", hair: "#5A4A7A", seconds: 14 },
    { from: [3.55, 4.5] as V2, to: [3.55, 9.6] as V2, color: "#8FC4F2", hair: "#8A5C3C", seconds: 17 },
    { from: [0.4, 3.55] as V2, to: [2.6, 3.55] as V2, color: "#C9B6FF", hair: "#2B2440", seconds: 9 },
  ],
  hearts: [
    { pos: [7.4, 4.9, 1.0] as V3, color: "#FF8FB8", scale: 1.1, phase: 0 },
    { pos: [2.2, 4.4, 1.9] as V3, color: "#C9B6FF", scale: 0.8, phase: 2 },
    { pos: [0.6, 3.4, 9.2] as V3, color: "#A8D8FF", scale: 0.7, phase: 4 },
  ],
  clouds: [
    { y: 6.4, z: -1.5, scale: 1.3, offset: 6 },
    { y: 5.6, z: -3, scale: 0.9, offset: 22 },
    { y: 7.2, z: -2.2, scale: 1.1, offset: 38 },
  ],
  /** used when no member data is available */
  houseFallback: ["#FFD0E2", "#D6ECFF", "#E4DAFF", "#FFF1B8", "#FFE6D2", "#D3EEDC", "#FFB6D3", "#CFC0FF"],
};

export type { CitySpot };
