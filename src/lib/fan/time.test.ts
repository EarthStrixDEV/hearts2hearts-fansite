import { describe, expect, it } from "vitest";
import { dayNumberSince, formatDay, formatZoned, ICT, KST, splitRemaining, todayIct } from "./time";

// 2nd anniversary: Feb 24, 2027 00:00 KST
const ANNIVERSARY = "2027-02-23T15:00:00Z";

describe("fan time", () => {
  it("prints the same instant in Korea and Thailand (ICT is two hours behind KST)", () => {
    expect(formatZoned(ANNIVERSARY, KST)).toBe("Feb 24, 2027, 00:00");
    expect(formatZoned(ANNIVERSARY, ICT)).toBe("Feb 23, 2027, 22:00");
    expect(formatZoned(ANNIVERSARY, ICT, false)).toBe("Feb 23, 22:00");
  });

  it("formats a plain date without shifting the day", () => {
    expect(formatDay("2025-02-24")).toBe("Feb 24, 2025");
  });

  it("takes today's date in Thailand, not UTC", () => {
    // 2026-11-24 18:30 UTC is already Nov 25, 01:30 in Bangkok
    expect(todayIct(Date.UTC(2026, 10, 24, 18, 30))).toBe("2026-11-25");
  });

  it("counts the join date as day 1 and never goes below 1", () => {
    const now = Date.UTC(2026, 10, 25, 5, 0);
    expect(dayNumberSince("2026-11-25", now)).toBe(1);
    expect(dayNumberSince("2026-11-24", now)).toBe(2);
    expect(dayNumberSince("2026-12-01", now)).toBe(1);
  });

  it("splits the remaining time and stops at zero", () => {
    const target = Date.UTC(2027, 1, 23, 15);
    expect(splitRemaining(target, target - (2 * 86_400 + 3 * 3600 + 4 * 60 + 5) * 1000)).toEqual({ d: 2, h: 3, m: 4, s: 5, done: false });
    expect(splitRemaining(target, target + 5000)).toEqual({ d: 0, h: 0, m: 0, s: 0, done: true });
  });
});
