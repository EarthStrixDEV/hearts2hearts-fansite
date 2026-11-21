import "server-only";
import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import type { CitySpot } from "./types";
import { SEED_CITY_SPOTS, type CitySpotView } from "./seed/city";

export const CITY_TAG = "city";

const PALETTE: [string, string, string][] = [
  ["#FFD0E2", "#FFB6D3", "#FF9EC3"],
  ["#E4DAFF", "#CFC0FF", "#B9A3F5"],
  ["#D6ECFF", "#B3D9FA", "#8FC4F2"],
  ["#FFE6D2", "#FFD0AE", "#F5B98F"],
];
const DOTS = ["#FF8FB8", "#B9A3F5", "#8FC4F2", "#F5B98F", "#FFD25E"];

function hrefFor(s: CitySpot): string {
  if (s.link_type === "url" && s.link_url && /^(https?:\/\/|\/(?!\/))/.test(s.link_url)) return s.link_url;
  if (s.link_type === "member") return "/members";
  if (s.link_type === "event") return "/schedule";
  if (s.link_type === "post") return "/blog";
  return "/";
}

/**
 * DB row -> view. Coordinates follow three.js: pos_x / pos_z are ground-plane (city grid 0..10), pos_y is elevation of the base.
 * The .glb in model_id is not loaded yet (no model assets exist); each spot renders as a coloured block building.
 */
function toView(s: CitySpot, i: number): CitySpotView {
  const x = Number(s.pos_x), y = Number(s.pos_z);
  const building = { id: s.id, x, y, w: 1.6, d: 1.6, h: 1.6 + (i % 3) * 0.6, colors: PALETTE[i % PALETTE.length] };
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? "",
    href: hrefFor(s),
    dot: DOTS[i % DOTS.length],
    buildings: [building],
    pos: [x + building.w / 2, Number(s.pos_y), y + building.d / 2],
  };
}

const load = unstable_cache(
  async (): Promise<CitySpotView[]> => {
    // No database configured -> design seed. With a database, zero published spots = empty city (empty state in the UI).
    if (!hasDb()) return SEED_CITY_SPOTS;
    try {
      const rows = await query<CitySpot>(
        "select id, name, description, pos_x, pos_y, pos_z, model_id, link_type, link_id, link_url, status from city_spots where status = 'published' order by name, id",
      );
      return rows.map(toView);
    } catch (e) {
      console.error("getCitySpots failed", e);
      return [];
    }
  },
  ["city-spots"],
  { tags: [CITY_TAG], revalidate: 3600 },
);

export const getCitySpots = (): Promise<CitySpotView[]> => load();
