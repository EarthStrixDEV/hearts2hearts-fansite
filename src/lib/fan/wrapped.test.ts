import { describe, expect, it } from "vitest";
import { binderPercent, buildSlides, MIN_FANS_FOR_RANK, parseYear, shareText, topPercent, WrappedData } from "./wrapped";

const base: WrappedData = {
  v: 1, year: 2026, nickname: "Mina", score: 40, rank: 1, fans: 40, activeDays: 12, logins: 9, missions: 3, liveAttended: 1,
  binder: { have: 17, want: 5, total: 25 }, bias: { id: "m1", name: "Stella", color: "#A8D8FF", have: 4 },
  fandom: { fans: 40, actions: 900 }, images: [],
};
const ids = (d: WrappedData) => buildSlides(d).map((s) => s.id);

describe("topPercent", () => {
  it("rank 1 of 40 is Top 3% (rounded up) and never below 1%", () => {
    expect(topPercent(1, 40)).toBe(3);
    expect(topPercent(1, 1000)).toBe(1);
  });
  it("last place is Top 100%, a lone fan is Top 100%", () => {
    expect(topPercent(40, 40)).toBe(100);
    expect(topPercent(1, 1)).toBe(100);
  });
  it("guards a bad fan count", () => {
    expect(topPercent(1, 0)).toBe(100);
  });
});

describe("binderPercent", () => {
  it("rounds, and is 0 when no card is published", () => {
    expect(binderPercent({ have: 17, total: 25 })).toBe(68);
    expect(binderPercent({ have: 0, total: 0 })).toBe(0);
    expect(binderPercent({ have: 9, total: 3 })).toBe(100);
  });
});

describe("buildSlides", () => {
  it("builds every earned slide in artboard order and never a stream / top-track slide", () => {
    expect(ids(base)).toEqual(["intro", "days", "rank", "binder", "bias"]);
    const text = JSON.stringify(buildSlides(base)).toLowerCase();
    expect(text).not.toContain("streamed");
    expect(text).not.toContain("most played");
  });

  it("shows the rank as a percentile only", () => {
    const rank = buildSlides(base).find((s) => s.id === "rank")!;
    expect(rank.big).toBe("Top 3%");
    expect(JSON.stringify(rank)).not.toContain("Mina");
  });

  it("leaves out the rank slide when there are too few fans to compare", () => {
    expect(ids({ ...base, fans: MIN_FANS_FOR_RANK - 1, rank: 1 })).not.toContain("rank");
    expect(ids({ ...base, fans: MIN_FANS_FOR_RANK })).toContain("rank");
  });

  it("leaves out slides that have no data behind them", () => {
    const bare = { ...base, activeDays: 0, binder: { have: 0, want: 0, total: 25 }, bias: null };
    expect(ids(bare)).toEqual(["intro", "rank"]);
    expect(ids({ ...base, binder: { have: 3, want: 0, total: 0 } })).not.toContain("binder");
  });

  it("describes the days slide from the real counts only", () => {
    const days = buildSlides({ ...base, logins: 1, missions: 0, liveAttended: 2 }).find((s) => s.id === "days")!;
    expect(days.sub).toBe("1 login · 2 live rooms");
    expect(days.line).toBe("days you showed up");
    expect(buildSlides({ ...base, activeDays: 1 }).find((s) => s.id === "days")!.line).toBe("day you showed up");
  });

  it("bias slide copes with a bias that has no cards yet", () => {
    const b = buildSlides({ ...base, bias: { id: "m1", name: "Stella", color: "#A8D8FF", have: 0 } }).find((s) => s.id === "bias")!;
    expect(b.big).toBe("Stella");
    expect(b.line).toBe("Your bias for 2026");
  });
});

describe("parseYear", () => {
  it("accepts a 4-digit year from the first year to the current one", () => {
    expect(parseYear("2026", 2026)).toBe(2026);
    expect(parseYear("2025", 2026)).toBe(2025);
  });
  it("rejects the future, the past and junk", () => {
    for (const raw of ["2027", "2024", "26", "2026a", "", "-2026", "2026.5", " 2026"]) expect(parseYear(raw, 2026), raw).toBeNull();
  });
});

describe("WrappedData / shareText", () => {
  it("parses a full snapshot, defaults images, and rejects the empty object", () => {
    const { images, ...noImages } = base;
    void images;
    expect(WrappedData.parse(noImages).images).toEqual([]);
    expect(WrappedData.safeParse({}).success).toBe(false);
  });
  it("share text has the rank only when it is shown", () => {
    expect(shareText(base)).toContain("Top 3%");
    expect(shareText({ ...base, fans: 3 })).not.toContain("Top");
    expect(shareText(base)).toContain("12 days");
  });
});
