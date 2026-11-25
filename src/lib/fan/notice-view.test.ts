import { describe, expect, it } from "vitest";
import { eventView, pickError, stepStates, timedCount } from "./notice-view";

describe("stepStates", () => {
  it("tracks the three steps through the phases", () => {
    expect(stepStates("idle")).toEqual(["todo", "todo", "todo"]);
    expect(stepStates("uploading")).toEqual(["active", "todo", "todo"]);
    expect(stepStates("reading")).toEqual(["active", "active", "todo"]);
    expect(stepStates("done")).toEqual(["done", "done", "done"]);
    expect(stepStates("failed")).toEqual(["todo", "todo", "todo"]);
  });
});

describe("eventView", () => {
  const clear = { title_ko: "음악방송", title_th: "เวทีรายการเพลง", starts_at: "2026-12-05T08:00:00.000Z", confidence: 0.95 };

  it("shows Korea and Thai time for the same instant, two hours apart", () => {
    expect(eventView(clear, 0)).toMatchObject({ mon: "DEC", day: "5", kst: "Dec 5, 17:00", ict: "Dec 5, 15:00", check: false, hasTime: true, title: "เวทีรายการเพลง" });
  });

  it("keeps the Thai date when it differs from the Korean one", () => {
    const v = eventView({ ...clear, starts_at: "2026-12-04T16:30:00.000Z" }, 0); // 01:30 KST on the 5th
    expect([v.day, v.kst, v.ict]).toEqual(["5", "Dec 5, 01:30", "Dec 4, 23:30"]);
  });

  it("an item without a time is TBA with the check badge", () => {
    expect(eventView({ ...clear, starts_at: null }, 1)).toMatchObject({ mon: "TBA", kst: "TBA", ict: "TBA", check: true, hasTime: false });
  });

  it("low confidence adds the badge even with a time; the title falls back to Korean", () => {
    expect(eventView({ ...clear, confidence: 0.69 }, 0).check).toBe(true);
    expect(eventView({ ...clear, title_th: "  " }, 0).title).toBe("음악방송");
  });

  it("counts timed items", () => {
    expect(timedCount([clear, { ...clear, starts_at: null }, clear])).toBe(2);
  });
});

describe("pickError", () => {
  const MAX = 8 * 1024 * 1024;
  it("accepts png/jpeg/webp up to 8 MB", () => {
    expect(pickError({ type: "image/png", size: MAX }, MAX)).toBeNull();
    expect(pickError({ type: "image/webp", size: 1 }, MAX)).toBeNull();
  });
  it("rejects other types, empty and oversized files", () => {
    expect(pickError({ type: "image/gif", size: 10 }, MAX)).toMatch(/PNG, JPEG or WebP/);
    expect(pickError({ type: "image/svg+xml", size: 10 }, MAX)).not.toBeNull();
    expect(pickError({ type: "image/png", size: 0 }, MAX)).toMatch(/8 MB/);
    expect(pickError({ type: "image/png", size: MAX + 1 }, MAX)).toMatch(/8 MB/);
  });
});
