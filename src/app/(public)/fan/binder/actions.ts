"use server";

import { revalidatePath } from "next/cache";
import { hasFanDb } from "@/lib/db/fan-client";
import { sendTradeRequest, setCardState as saveSlot, updateTrade } from "@/lib/db/fan-binder";
import { getSessionUserId } from "@/lib/db/fan-session";
import { RequestTradeInput, SetCardInput, TradeCommandInput } from "@/lib/fan/binder";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SIGN_IN = { ok: false, error: "Sign in to use your binder." } as const;
const BAD_INPUT = { ok: false, error: "That request was not valid." } as const;

async function sessionUser(): Promise<string | null> {
  if (!hasFanDb()) return null;
  try {
    return await getSessionUserId();
  } catch (e) {
    console.error("binder: no session", e);
    return null;
  }
}

/** Sets one binder slot for the signed-in fan. */
export async function setCardState(input: unknown): Promise<ActionResult> {
  const parsed = SetCardInput.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const userId = await sessionUser();
  if (!userId) return SIGN_IN;
  try {
    const saved = await saveSlot(userId, parsed.data.photocardId, parsed.data.state);
    if (!saved) return { ok: false, error: "That card is not available." };
    revalidatePath("/fan/binder"); // trade matches depend on the binder
    return { ok: true };
  } catch (e) {
    console.error("setCardState failed", e);
    return { ok: false, error: "Could not save. Try again." };
  }
}

/** "Send trade request" on a match card. */
export async function requestTrade(input: unknown): Promise<ActionResult> {
  const parsed = RequestTradeInput.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const userId = await sessionUser();
  if (!userId) return SIGN_IN;
  const r = await sendTradeRequest(userId, parsed.data);
  if (r.ok) revalidatePath("/fan/binder");
  return r.ok ? { ok: true } : r;
}

/** accept / cancel / ship (with tracking number) / receive / rate on one of the fan's trades. */
export async function tradeStep(input: unknown): Promise<ActionResult> {
  const parsed = TradeCommandInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? BAD_INPUT.error };
  const userId = await sessionUser();
  if (!userId) return SIGN_IN;
  const r = await updateTrade(userId, parsed.data);
  if (r.ok) revalidatePath("/fan/binder");
  return r.ok ? { ok: true } : r;
}
