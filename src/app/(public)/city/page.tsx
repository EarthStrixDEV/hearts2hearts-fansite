import type { Metadata } from "next";
import { CityExperience } from "@/components/city/CityExperience";
import { getCitySpots } from "@/lib/db/city";
import "./city.css";

export const metadata: Metadata = {
  title: "Mini City",
  description: "Explore Heart Town, the Hearts2Hearts mini city, and fly to each part of the site.",
};

export default async function CityPage() {
  const spots = await getCitySpots();
  return <CityExperience spots={spots} />;
}
