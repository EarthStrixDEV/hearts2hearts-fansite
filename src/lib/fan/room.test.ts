import { describe, expect, it } from "vitest";
import { defaultPlacement, Placement, ruleProgress, ruleText, togglePlacement, UnlockRuleSchema, type PlaceableItem } from "./room";

const ok = { x: 1, y: 0, z: -2, rot: 90 };

describe("Placement", () => {
  it("accepts a placement inside the room, including the edges", () => {
    expect(Placement.safeParse(ok).success).toBe(true);
    expect(Placement.safeParse({ x: -3, y: 4, z: 3, rot: -360 }).success).toBe(true);
  });

  it.each([
    ["outside the floor", { ...ok, x: 3.01 }],
    ["underground", { ...ok, y: -0.1 }],
    ["above the wall", { ...ok, y: 4.1 }],
    ["rotation out of range", { ...ok, rot: 361 }],
    ["NaN", { ...ok, z: Number.NaN }],
    ["Infinity", { ...ok, x: Infinity }],
    ["a numeric string", { ...ok, x: "1" }],
    ["a missing field", { x: 1, y: 0, z: 0 }],
    ["null", null],
  ])("rejects %s", (_, v) => {
    expect(Placement.safeParse(v).success).toBe(false);
  });

  it("drops unknown keys", () => {
    expect(Placement.parse({ ...ok, extra: "x" })).toEqual(ok);
  });
});

describe("UnlockRuleSchema", () => {
  it("accepts the DB shape, including a numeric string count", () => {
    expect(UnlockRuleSchema.parse({ kind: "login", count: 7 })).toEqual({ kind: "login", count: 7 });
    expect(UnlockRuleSchema.parse({ kind: "card", count: "8" })).toEqual({ kind: "card", count: 8 });
  });
  it("rejects unknown kinds and non-positive counts", () => {
    expect(UnlockRuleSchema.safeParse({ kind: "purchase", count: 1 }).success).toBe(false);
    expect(UnlockRuleSchema.safeParse({ kind: "login", count: 0 }).success).toBe(false);
  });
});

describe("ruleText / ruleProgress", () => {
  it("words each kind, singular and plural", () => {
    expect(ruleText({ kind: "login", count: 1 })).toBe("Log in once");
    expect(ruleText({ kind: "login", count: 7 })).toBe("Log in on 7 different days");
    expect(ruleText({ kind: "card", count: 1 })).toBe("Collect 1 photocard in your binder");
    expect(ruleText({ kind: "card", count: 8 })).toBe("Collect 8 photocards in your binder");
    expect(ruleText({ kind: "live_attend", count: 2 })).toBe("Join 2 live waiting rooms");
    expect(ruleText({ kind: "mission", count: 3 })).toBe("Complete 3 fandom missions");
  });

  it("caps progress at the target and treats a missing kind as zero", () => {
    expect(ruleProgress({ kind: "card", count: 8 }, { card: 3 })).toEqual({ have: 3, need: 8 });
    expect(ruleProgress({ kind: "card", count: 8 }, { card: 20 })).toEqual({ have: 8, need: 8 });
    expect(ruleProgress({ kind: "mission", count: 3 }, { card: 3 })).toEqual({ have: 0, need: 3 });
  });
});

describe("defaultPlacement", () => {
  it("returns a valid placement for every seeded slug and for unknown slugs in every slot", () => {
    for (const slug of ["sky-blue-rug", "lemon-tang-poster", "bias-card-frame", "fairy-lights", "album-shelf", "lightstick-lamp", "i-was-here-badge"]) {
      expect(Placement.safeParse(defaultPlacement(slug, 0)).success, slug).toBe(true);
    }
    for (let slot = 0; slot < 30; slot++) expect(Placement.safeParse(defaultPlacement("something-new", slot)).success, `slot ${slot}`).toBe(true);
  });

  it("puts wall items against their wall, facing the room", () => {
    expect(defaultPlacement("lemon-tang-poster", 0)).toMatchObject({ x: -2.93, rot: 90 }); // left wall
    expect(defaultPlacement("bias-card-frame", 0)).toMatchObject({ z: -2.93, rot: 0 }); // right wall
  });
});

describe("togglePlacement", () => {
  const rug: PlaceableItem = { id: "a", slug: "sky-blue-rug", placed: false, placement: null };
  const poster: PlaceableItem = { id: "b", slug: "lemon-tang-poster", placed: true, placement: { x: -2, y: 1, z: 0, rot: 90 } };

  it("places an item at its default spot and reports the change", () => {
    const r = togglePlacement([rug, poster], "a");
    expect(r?.change).toEqual({ placed: true, placement: defaultPlacement("sky-blue-rug", 1) });
    expect(r?.items.find((i) => i.id === "a")).toMatchObject({ placed: true, placement: r?.change.placement });
    expect(r?.items.find((i) => i.id === "b")).toBe(poster); // others untouched
  });

  it("removes a placed item but remembers where it was", () => {
    const r = togglePlacement([rug, poster], "b");
    expect(r?.change).toEqual({ placed: false, placement: null });
    expect(r?.items.find((i) => i.id === "b")).toMatchObject({ placed: false, placement: poster.placement });
  });

  it("puts a removed item back where it was", () => {
    const removed = togglePlacement([rug, poster], "b")!.items;
    expect(togglePlacement(removed, "b")?.change).toEqual({ placed: true, placement: poster.placement });
  });

  it("does not mutate its input and ignores an unknown id", () => {
    const input = [rug, poster];
    togglePlacement(input, "a");
    expect(input).toEqual([rug, poster]);
    expect(togglePlacement(input, "nope")).toBeNull();
  });
});
