import { z } from "zod";

// Pure binder / trade logic shared by the server actions, the data layer and the UI (no server-only imports, so it is unit-tested directly).

export type SlotState = "missing" | "have" | "want";
export type TradeState = "pending" | "accepted" | "shipped" | "done" | "cancelled";

const NEXT: Record<SlotState, SlotState> = { missing: "have", have: "want", want: "missing" };
/** Tap order from the artboard: missing -> have -> want -> missing. */
export const nextSlotState = (s: SlotState): SlotState => NEXT[s];

export interface BinderTally { have: number; want: number; total: number; pct: number }
/** Counters under the title. `pct` = share of the set that is `have`, rounded to a whole percent (0 for an empty set). */
export function tallyBinder(states: readonly SlotState[]): BinderTally {
  const have = states.filter((s) => s === "have").length;
  const want = states.filter((s) => s === "want").length;
  const total = states.length;
  return { have, want, total, pct: total === 0 ? 0 : Math.round((have / total) * 100) };
}

export type TradeActionKind = "accept" | "cancel" | "ship" | "receive" | "rate";
export interface TradeView {
  state: TradeState;
  /** the viewer sent the request */
  outgoing: boolean;
  /** the viewer is the one who marked it shipped */
  shippedByMe: boolean;
  myRating: number | null;
}

/**
 * What the viewer can do next on a trade. Mirrors app.trade_state_guard (the database is the authority; this only decides which
 * buttons to show): only the recipient accepts, either side cancels before shipping or ships with a tracking number, the OTHER party
 * confirms delivery, and each side rates once after `done`.
 */
export function tradeActions(t: TradeView): TradeActionKind[] {
  switch (t.state) {
    case "pending": return t.outgoing ? ["cancel"] : ["accept", "cancel"];
    case "accepted": return ["ship", "cancel"];
    case "shipped": return t.shippedByMe ? [] : ["receive"];
    case "done": return t.myRating === null ? ["rate"] : [];
    default: return [];
  }
}

export const TRADE_STATE_LABEL: Record<TradeState, string> = {
  pending: "Pending", accepted: "Accepted", shipped: "Shipped", done: "Done", cancelled: "Cancelled",
};

const Uuid = z.guid();
export const SetCardInput = z.object({ photocardId: Uuid, state: z.enum(["missing", "have", "want"]) });
export const RequestTradeInput = z.object({ partnerId: Uuid, giveCardId: Uuid, getCardId: Uuid });
export const TradeCommandInput = z.discriminatedUnion("kind", [
  z.object({ id: Uuid, kind: z.literal("accept") }),
  z.object({ id: Uuid, kind: z.literal("cancel") }),
  z.object({ id: Uuid, kind: z.literal("ship"), trackingNo: z.string().trim().min(1, "Enter the tracking number").max(60) }),
  z.object({ id: Uuid, kind: z.literal("receive") }),
  z.object({ id: Uuid, kind: z.literal("rate"), rating: z.number().int().min(1).max(5) }),
]);
export type TradeCommand = z.infer<typeof TradeCommandInput>;

/** Friendly text for the database's trade rule errors (42501 = not allowed for this person, 23514 = illegal step). */
export function tradeErrorMessage(code: unknown): string {
  if (code === "42501") return "You can't do that on this trade.";
  if (code === "23514") return "That step isn't allowed right now.";
  return "Something went wrong. Try again.";
}
