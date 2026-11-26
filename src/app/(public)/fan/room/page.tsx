import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RoomExperience, type InventoryItem, type LockedItem } from "@/components/fan/room/RoomExperience";
import { hasFanDb } from "@/lib/db/fan-client";
import { getMyRoom } from "@/lib/db/fan-room";
import { getSessionUserId } from "@/lib/db/fan-session";
import { ruleProgress, ruleText } from "@/lib/fan/room";
import { setRoomItemPlaced } from "./actions";

export const metadata: Metadata = { title: "My room" };
// Personal and per request: unlocks and placement belong to the signed-in fan.
export const dynamic = "force-dynamic";

export default async function RoomPage() {
  if (!hasFanDb()) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16">
        <Link href="/fan">← S2U hub</Link>
        <p className="mt-4 text-ink-500">My room is not available right now.</p>
      </div>
    );
  }

  let userId: string | null = null;
  try {
    userId = await getSessionUserId();
  } catch (e) {
    console.error("fan room: session unavailable", e); // auth env missing: treat as signed out
  }
  if (!userId) redirect("/auth/sign-in");

  const room = await getMyRoom(userId);
  const items: InventoryItem[] = room.items
    .filter((i) => i.unlocked)
    .map((i) => ({ id: i.id, slug: i.slug, name: i.name, from: ruleText(i.rule), modelUrl: i.modelUrl, placed: i.placed, placement: i.placement }));
  const locked: LockedItem[] = room.items
    .filter((i) => !i.unlocked)
    .map((i) => ({ id: i.id, name: i.name, text: ruleText(i.rule), ...ruleProgress(i.rule, room.totals) }));

  return <RoomExperience nickname={room.nickname} items={items} locked={locked} setPlaced={setRoomItemPlaced} />;
}
