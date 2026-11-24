import "server-only";
import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import type { CitySpot } from "./types";
import { SEED_CITY_SPOTS, kindForHref, spotView, type CitySpotView } from "./seed/city";

export const CITY_TAG = "city";

function hrefFor(s: CitySpot): string {
  if (s.link_type === "url" && s.link_url && /^(https?:\/\/|\/(?!\/))/.test(s.link_url)) return s.link_url;
  if (s.link_type === "member") return "/members";
  if (s.link_type === "event") return "/schedule";
  if (s.link_type === "post") return "/blog";
  return "/";
}

/**
 * DB row -> view. Coordinates follow three.js: pos_x / pos_z are the lot corner on the ground plane (city grid 0..10).
 * The .glb in model_id is not loaded yet (no model assets exist); each spot renders the procedural building for its
 * link (music store, concert hall, school, café, member houses, or a generic block).
 */
function toView(s: CitySpot): CitySpotView {
  const href = hrefFor(s);
  return spotView({ id: s.id, name: s.name, description: s.description ?? "", href, kind: kindForHref(href), x: Number(s.pos_x), z: Number(s.pos_z) });
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
  ["city-spots:v3"],
  { tags: [CITY_TAG], revalidate: 3600 },
);

export const getCitySpots = (): Promise<CitySpotView[]> => load();
