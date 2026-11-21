// Seed = SPOTS + BL (building layout) from design/project/City.dc.html. Positions are in city-grid units (10x10 ground, y = depth).
import type { CitySpot } from "../types";

export interface CityBuilding { id: string; x: number; y: number; w: number; d: number; h: number; colors: [string, string, string] }

/** A spot groups one or more buildings (design `grp`); view-model on top of CitySpot rows. */
export interface CitySpotView {
  id: string;
  name: string;
  description: string;
  href: string;
  dot: string;
  buildings: CityBuilding[];
  /** centre of the group on the ground plane, used for the fly-to camera */
  pos: [number, number, number];
}

const pink: [string, string, string] = ["#FFD0E2", "#FFB6D3", "#FF9EC3"];
const lilac: [string, string, string] = ["#E4DAFF", "#CFC0FF", "#B9A3F5"];
const sky: [string, string, string] = ["#D6ECFF", "#B3D9FA", "#8FC4F2"];
const peach: [string, string, string] = ["#FFE6D2", "#FFD0AE", "#F5B98F"];
const house = (top: string): [string, string, string] => [top, "#FFF0E6", "#EED7CB"];

const B: Record<string, CityBuilding> = {
  music: { id: "music", x: 1, y: 1, w: 2, d: 2, h: 2.2, colors: pink },
  hall: { id: "hall", x: 5.6, y: 0.8, w: 3.2, d: 2.2, h: 3, colors: lilac },
  school: { id: "school", x: 1, y: 5, w: 2, d: 2.4, h: 2.6, colors: sky },
  cafe: { id: "cafe", x: 6.4, y: 6.2, w: 2, d: 2, h: 1.6, colors: peach },
  h1: { id: "h1", x: 4.2, y: 4.3, w: 0.9, d: 0.9, h: 1.1, colors: house("#FFD0E2") },
  h2: { id: "h2", x: 5.4, y: 4.3, w: 0.9, d: 0.9, h: 1.3, colors: house("#D6ECFF") },
  h3: { id: "h3", x: 4.2, y: 5.5, w: 0.9, d: 0.9, h: 1.0, colors: house("#E4DAFF") },
  h4: { id: "h4", x: 5.4, y: 5.5, w: 0.9, d: 0.9, h: 1.2, colors: house("#FFF1B8") },
};

const centre = (bs: CityBuilding[]): [number, number, number] => [
  bs.reduce((a, b) => a + b.x + b.w / 2, 0) / bs.length,
  0,
  bs.reduce((a, b) => a + b.y + b.d / 2, 0) / bs.length,
];

const mk = (id: string, name: string, href: string, dot: string, ids: string[], description: string): CitySpotView => {
  const buildings = ids.map((i) => B[i]);
  return { id, name, href, dot, buildings, description, pos: centre(buildings) };
};

export const SEED_CITY_SPOTS: CitySpotView[] = [
  mk("music", "Music Store", "/music", "#FF8FB8", ["music"], "The discography, popular tracks, music videos and the player all live here."),
  mk("hall", "Concert Hall", "/schedule", "#B9A3F5", ["hall"], "Concerts, fan meetings and music shows, with a countdown to the next one."),
  mk("school", "School", "/game", "#8FC4F2", ["school"], "Test what you know: quiz, memory match and more mini games."),
  mk("cafe", "Café", "/blog", "#F5B98F", ["cafe"], "Grab a drink and read today’s AI-written fan note."),
  mk("houses", "Member Houses", "/members", "#FFD25E", ["h1", "h2", "h3", "h4"], "Eight little houses, one for each member. Visit their profiles."),
];

/** Decorative scene content from the design: ground size, roads, walkers, floating hearts. */
export const CITY_SCENE = {
  size: 10,
  roads: [
    { x: 0, y: 3.3, w: 10, d: 0.5 },
    { x: 3.3, y: 0, w: 0.5, d: 10 },
  ],
  walkers: [
    { from: [0.3, 3.55] as [number, number], to: [9.3, 3.55] as [number, number], color: "#FF8FB8", hair: "#5A4A7A", seconds: 14 },
    { from: [3.55, 0.3] as [number, number], to: [3.55, 9.3] as [number, number], color: "#8FC4F2", hair: "#8A5C3C", seconds: 17 },
  ],
  hearts: [
    { pos: [7.1, 4.2, 1.4] as [number, number, number], color: "#FF8FB8", scale: 1.2, phase: 0 },
    { pos: [2.3, 4.6, 1.8] as [number, number, number], color: "#C9B6FF", scale: 0.9, phase: 2 },
    { pos: [5.6, 1.4, 2.2] as [number, number, number], color: "#A8D8FF", scale: 0.7, phase: 4 },
  ],
};

export type { CitySpot };
