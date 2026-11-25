import { describe, expect, it } from "vitest";
import type { FanEra } from "@/lib/db/fan";
import { FALLBACK_ERA, parseStoredTheme, resolveTheme, type ThemeMember } from "./theme";

const eras: FanEra[] = [
  { id: "e1", title: "Focus", sub: "", from: "#E9E1FF", to: "#C9B6FF" },
  { id: "e2", title: "Lemon Tang", sub: "", from: "#FFF6C9", to: "#FFE08A" },
];
const members: ThemeMember[] = [{ id: "m1", name: "Stella", ko: null, color: "#A8D8FF", photo: null }];

describe("resolveTheme", () => {
  it("defaults to the newest era", () => {
    const t = resolveTheme({ mode: "era", biasId: null, eraId: null }, members, eras);
    expect(t.era.id).toBe("e2");
    expect(t).toMatchObject({ accent: "#FFE08A", pageTint: "#FFF6C9", label: "Lemon Tang era", bias: null });
  });

  it("bias mode wears the member color, over the era's end color", () => {
    const t = resolveTheme({ mode: "bias", biasId: "m1", eraId: "e1" }, members, eras);
    expect(t).toMatchObject({ accent: "#A8D8FF", pageTint: "#A8D8FF66", heroFrom: "#A8D8FF", heroTo: "#C9B6FF", label: "Stella’s color" });
  });

  it("ignores a stored bias while the mode is era, and survives an empty catalogue", () => {
    expect(resolveTheme({ mode: "era", biasId: "m1", eraId: "e1" }, members, eras).bias).toBeNull();
    expect(resolveTheme({ mode: "era", biasId: null, eraId: null }, [], []).era).toBe(FALLBACK_ERA);
  });
});

describe("parseStoredTheme", () => {
  it("accepts a known choice and drops unknown ids", () => {
    expect(parseStoredTheme('{"mode":"bias","biasId":"m1","eraId":"gone"}', members, eras)).toEqual({ mode: "bias", biasId: "m1", eraId: null });
  });
  it("rejects garbage", () => {
    for (const raw of [null, "", "nope", '{"mode":"x"}', "null"]) expect(parseStoredTheme(raw, members, eras)).toBeNull();
  });
});
