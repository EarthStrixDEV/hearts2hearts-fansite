"use server";

import { z } from "zod";
import { hasFanDb } from "@/lib/db/fan-client";
import { setItemPlaced } from "@/lib/db/fan-room";
import { getSessionUserId } from "@/lib/db/fan-session";
import { Placement } from "@/lib/fan/room";

const Input = z
  .object({ itemId: z.guid(), placed: z.boolean(), placement: Placement.nullable() })
  .refine((v) => !v.placed || v.placement !== null, "placing an item needs a placement");

/** Places or removes one of the signed-in fan's unlocked room items. `saved: false` = nothing changed (invalid, signed out, locked). */
export async function setRoomItemPlaced(input: unknown): Promise<{ saved: boolean }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success || !hasFanDb()) return { saved: false };
  try {
    const userId = await getSessionUserId();
    if (!userId) return { saved: false };
    const { itemId, placed, placement } = parsed.data;
    return { saved: await setItemPlaced(userId, itemId, placed, placement) };
  } catch (e) {
    console.error("setRoomItemPlaced failed", e);
    return { saved: false };
  }
}
