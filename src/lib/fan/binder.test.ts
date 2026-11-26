import { describe, expect, it } from "vitest";
import { nextSlotState, RequestTradeInput, SetCardInput, tallyBinder, TradeCommandInput, tradeActions, tradeErrorMessage, type SlotState, type TradeView } from "./binder";

describe("binder slot state", () => {
  it("cycles missing -> have -> want -> missing", () => {
    expect(nextSlotState("missing")).toBe("have");
    expect(nextSlotState("have")).toBe("want");
    expect(nextSlotState("want")).toBe("missing");
    let s: SlotState = "missing";
    for (let i = 0; i < 6; i++) s = nextSlotState(s);
    expect(s).toBe("missing");
  });

  it("tallies have / want / percent complete", () => {
    expect(tallyBinder([])).toEqual({ have: 0, want: 0, total: 0, pct: 0 });
    // the artboard's sample binder: 7 have, 3 want of 16 -> 44%
    const init = ["have", "want", "have", "", "have", "", "want", "have", "", "have", "have", "", "want", "", "have", ""].map((x) => x || "missing") as SlotState[];
    expect(tallyBinder(init)).toEqual({ have: 7, want: 3, total: 16, pct: 44 });
    expect(tallyBinder(["have", "have", "have"]).pct).toBe(100);
    expect(tallyBinder(["want", "missing"]).pct).toBe(0);
    expect(tallyBinder(["have", "missing", "missing"]).pct).toBe(33);
  });
});

describe("trade next steps", () => {
  const v = (o: Partial<TradeView>): TradeView => ({ state: "pending", outgoing: true, shippedByMe: false, myRating: null, ...o });
  it("pending: only the recipient accepts, either side can cancel", () => {
    expect(tradeActions(v({ state: "pending", outgoing: true }))).toEqual(["cancel"]);
    expect(tradeActions(v({ state: "pending", outgoing: false }))).toEqual(["accept", "cancel"]);
  });
  it("accepted: ship or cancel; shipped: only the receiver confirms; done: rate once", () => {
    expect(tradeActions(v({ state: "accepted" }))).toEqual(["ship", "cancel"]);
    expect(tradeActions(v({ state: "shipped", shippedByMe: true }))).toEqual([]);
    expect(tradeActions(v({ state: "shipped", shippedByMe: false }))).toEqual(["receive"]);
    expect(tradeActions(v({ state: "done" }))).toEqual(["rate"]);
    expect(tradeActions(v({ state: "done", myRating: 5 }))).toEqual([]);
    expect(tradeActions(v({ state: "cancelled" }))).toEqual([]);
  });
});

describe("input validation", () => {
  const id = "0b8c6f0e-2d8e-4f6e-9c43-0a1b2c3d4e5f";
  it("accepts well-formed card and trade inputs and rejects the rest", () => {
    expect(SetCardInput.safeParse({ photocardId: id, state: "have" }).success).toBe(true);
    expect(SetCardInput.safeParse({ photocardId: "x", state: "have" }).success).toBe(false);
    expect(SetCardInput.safeParse({ photocardId: id, state: "owned" }).success).toBe(false);
    expect(RequestTradeInput.safeParse({ partnerId: id, giveCardId: id, getCardId: id }).success).toBe(true);
    expect(RequestTradeInput.safeParse({ partnerId: id, giveCardId: id }).success).toBe(false);
  });
  it("needs a tracking number to ship and a 1-5 integer rating", () => {
    expect(TradeCommandInput.safeParse({ id, kind: "ship", trackingNo: "  " }).success).toBe(false);
    expect(TradeCommandInput.parse({ id, kind: "ship", trackingNo: " TH1 " })).toMatchObject({ trackingNo: "TH1" });
    expect(TradeCommandInput.safeParse({ id, kind: "ship", trackingNo: "x".repeat(61) }).success).toBe(false);
    expect(TradeCommandInput.safeParse({ id, kind: "rate", rating: 0 }).success).toBe(false);
    expect(TradeCommandInput.safeParse({ id, kind: "rate", rating: 6 }).success).toBe(false);
    expect(TradeCommandInput.safeParse({ id, kind: "rate", rating: 2.5 }).success).toBe(false);
    expect(TradeCommandInput.safeParse({ id, kind: "rate", rating: 5 }).success).toBe(true);
    expect(TradeCommandInput.safeParse({ id, kind: "refund" }).success).toBe(false);
  });
  it("maps database rule codes to friendly text", () => {
    expect(tradeErrorMessage("42501")).toMatch(/can't do that/);
    expect(tradeErrorMessage("23514")).toMatch(/isn't allowed/);
    expect(tradeErrorMessage(undefined)).toMatch(/went wrong/);
  });
});
