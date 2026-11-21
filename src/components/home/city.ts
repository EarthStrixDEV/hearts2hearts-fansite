// Isometric "Heart Town" teaser geometry, ported from buildCity() in design/project/Main.dc.html. Pure, runs on the server.
const U = 40, CX = 500, CY = 150;
type Pt = [number, number];
const P = (x: number, y: number, z: number): Pt => [CX + (x - y) * U * 0.866, CY + (x + y) * U * 0.5 - z * U];
const poly = (pts: Pt[]) => "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L") + " Z";

interface Block { x: number; y: number; w: number; d: number; h: number; c: [string, string, string] }
export interface CityBlock { top: string; left: string; right: string; door: string; ct: string; cl: string; cr: string; depth: number }

const pink: Block["c"] = ["#FFD0E2", "#FFB6D3", "#FF9EC3"];
const lilac: Block["c"] = ["#E4DAFF", "#CFC0FF", "#B9A3F5"];
const sky: Block["c"] = ["#D6ECFF", "#B3D9FA", "#8FC4F2"];
const peach: Block["c"] = ["#FFE6D2", "#FFD0AE", "#F5B98F"];
const house = (roof: string): Block["c"] => [roof, "#FFF0E6", "#EED7CB"];

const BLOCKS: Block[] = [
  { x: 1, y: 1, w: 2, d: 2, h: 2.2, c: pink }, { x: 5.6, y: 0.8, w: 3.2, d: 2.2, h: 3, c: lilac },
  { x: 1, y: 5, w: 2, d: 2.4, h: 2.6, c: sky }, { x: 6.4, y: 6.2, w: 2, d: 2, h: 1.6, c: peach },
  { x: 4.2, y: 4.3, w: 0.9, d: 0.9, h: 1.1, c: house("#FFD0E2") }, { x: 5.4, y: 4.3, w: 0.9, d: 0.9, h: 1.3, c: house("#D6ECFF") },
  { x: 4.2, y: 5.5, w: 0.9, d: 0.9, h: 1.0, c: house("#E4DAFF") }, { x: 5.4, y: 5.5, w: 0.9, d: 0.9, h: 1.2, c: house("#FFF1B8") },
];

function box({ x, y, w, d, h, c }: Block): CityBlock {
  const dh = Math.min(0.7, h * 0.4);
  return {
    top: poly([P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)]),
    left: poly([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)]),
    right: poly([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)]),
    door: poly([P(x + w * 0.4, y + d, 0), P(x + w * 0.6, y + d, 0), P(x + w * 0.6, y + d, dh), P(x + w * 0.4, y + d, dh)]),
    ct: c[0], cl: c[2], cr: c[1], depth: x + w / 2 + y + d / 2,
  };
}

export const CITY = {
  ground: poly([P(0, 0, 0), P(10, 0, 0), P(10, 10, 0), P(0, 10, 0)]),
  slabL: poly([P(0, 10, 0), P(10, 10, 0), P(10, 10, -0.4), P(0, 10, -0.4)]),
  slabR: poly([P(10, 0, 0), P(10, 10, 0), P(10, 10, -0.4), P(10, 0, -0.4)]),
  road1: poly([P(0, 3.3, 0), P(10, 3.3, 0), P(10, 3.8, 0), P(0, 3.8, 0)]),
  road2: poly([P(3.3, 0, 0), P(3.8, 0, 0), P(3.8, 10, 0), P(3.3, 10, 0)]),
  blocks: BLOCKS.map(box).sort((a, b) => a.depth - b.depth),
};
