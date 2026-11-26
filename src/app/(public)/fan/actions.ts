"use server";

import { z } from "zod";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";
import { saveFanTheme as save } from "@/lib/db/fan";

const Input = z.object({
  mode: z.enum(["bias", "era"]),
  biasId: z.guid().nullable(),
  eraId: z.guid().nullable(),
});

/**
 * Saves the signed-in fan's bias / era choice. Guests keep theirs in localStorage (client side), so for them this
 * returns { saved: false } without touching the database.
 */
export async function saveFanTheme(input: unknown): Promise<{ saved: boolean }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success || !hasFanDb()) return { saved: false };
  try {
    const userId = await getSessionUserId();
    if (!userId) return { saved: false };
    await save(userId, { mode: parsed.data.mode, biasMemberId: parsed.data.biasId, eraAlbumId: parsed.data.eraId });
    return { saved: true };
  } catch (e) {
    console.error("saveFanTheme failed", e);
    return { saved: false };
  }
}
