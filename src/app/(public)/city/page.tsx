import type { Metadata } from "next";
import { CityExperience } from "@/components/city/CityExperience";
import { getCitySpots } from "@/lib/db/city";
import { getMembers } from "@/lib/db/members";
import { CITY_SCENE, type CityHouse } from "@/lib/db/seed/city";
import "./city.css";

export const metadata: Metadata = {
  title: "Mini City",
  description: "Explore Heart Town, the Hearts2Hearts mini city, and fly to each part of the site.",
};

export default async function CityPage() {
  const [spots, members] = await Promise.all([getCitySpots(), getMembers().catch(() => [])]);
  // One house per member, roof in the member's colour; neutral placeholders if member data is unavailable.
  const houses: CityHouse[] = members.length
    ? members.map((m) => ({ name: m.stage_name, color: m.color_hex }))
    : CITY_SCENE.houseFallback.map((color, i) => ({ name: `House ${i + 1}`, color }));
  return <CityExperience spots={spots} houses={houses} />;
}
