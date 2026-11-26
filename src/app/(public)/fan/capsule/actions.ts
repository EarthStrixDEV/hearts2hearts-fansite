"use server";

import { revalidatePath } from "next/cache";
import { getFandom } from "@/lib/db/fan";
import { hasFanDb } from "@/lib/db/fan-client";
import { sealLetter } from "@/lib/db/fan-capsule";
import { getSessionUserId } from "@/lib/db/fan-session";
import { nextAnniversary } from "@/lib/fan/anniversary";
import { SealInput } from "@/lib/fan/capsule";

export type SealResult = { ok: true; openAt: string } | { ok: false; error: string };

/**
 * Seals a letter until the next debut anniversary at 00:00 KST. The open date is computed here from the stored debut date
 * and the server clock; the browser cannot choose it.
 */
export async function sealCapsule(input: unknown): Promise<SealResult> {
  const parsed = SealInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your letter and try again." };
  if (!hasFanDb()) return { ok: false, error: "Letters are unavailable right now. Try again later." };

  let userId: string | null;
  try {
    userId = await getSessionUserId();
  } catch (e) {
    console.error("sealCapsule: session unavailable", e);
    return { ok: false, error: "Sign in to seal a letter." };
  }
  if (!userId) return { ok: false, error: "Sign in to seal a letter." };

  try {
    const { openAt } = nextAnniversary((await getFandom()).debut_date, Date.now());
    await sealLetter(userId, { ...parsed.data, body: parsed.data.body.replace(/\r\n?/g, "\n") }, openAt);
    revalidatePath("/fan/capsule");
    return { ok: true, openAt: openAt.toISOString() };
  } catch (e) {
    console.error("sealCapsule failed", e);
    return { ok: false, error: "Couldn’t seal your letter. Nothing was saved, please try again." };
  }
}
