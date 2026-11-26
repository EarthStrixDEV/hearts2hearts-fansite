import { describe, expect, it } from "vitest";
import { daysUntil, formatDayZoned, nextAnniversary, ordinal } from "./anniversary";
import { formatZoned, ICT, KST } from "./time";

const DEBUT = "2025-02-24";
// 00:00 KST on Feb 24 = 15:00 UTC on Feb 23 of the same year
const at = (iso: string) => Date.parse(iso);
const next = (now: string, debut = DEBUT) => nextAnniversary(debut, at(now));

describe("nextAnniversary", () => {
  it("picks the coming Feb 24 at 00:00 KST (2nd anniversary from Nov 2026)", () => {
    const a = next("2026-11-25T03:00:00Z");
    expect(a.openAt.toISOString()).toBe("2027-02-23T15:00:00.000Z");
    expect(a.number).toBe(2);
    expect(formatZoned(a.openAt, KST)).toBe("Feb 24, 2027, 00:00");
    expect(formatZoned(a.openAt, ICT)).toBe("Feb 23, 2027, 22:00");
  });

  it("uses this year's anniversary while its midnight is still ahead", () => {
    const a = next("2026-02-23T14:59:59.999Z"); // 23:59:59.999 KST on Feb 23
    expect(a.openAt.toISOString()).toBe("2026-02-23T15:00:00.000Z");
    expect(a.number).toBe(1);
  });

  it("on the anniversary itself the midnight has passed: opens next year", () => {
    expect(next("2026-02-23T15:00:00Z").openAt.toISOString()).toBe("2027-02-23T15:00:00.000Z"); // exactly 00:00:00 KST
    expect(next("2026-02-24T01:00:00Z").openAt.toISOString()).toBe("2027-02-23T15:00:00.000Z"); // 10:00 KST on the day
    expect(next("2026-02-24T14:59:59Z").openAt.toISOString()).toBe("2027-02-23T15:00:00.000Z"); // 23:59:59 KST on the day
    expect(next("2026-02-24T01:00:00Z").number).toBe(2);
  });

  it("reads the date in KST, not UTC", () => {
    // 16:00 UTC on Feb 23 is already Feb 24 01:00 in Seoul
    expect(next("2026-02-23T16:00:00Z").openAt.toISOString()).toBe("2027-02-23T15:00:00.000Z");
  });

  it("after the debut it is always strictly in the future and at most a year away", () => {
    for (let day = 0; day < 800; day += 7) {
      const now = at("2025-03-01T00:00:00Z") + day * 86_400_000;
      const { openAt } = nextAnniversary(DEBUT, now);
      expect(openAt.getTime()).toBeGreaterThan(now);
      expect(openAt.getTime() - now).toBeLessThanOrEqual(366 * 86_400_000);
    }
  });

  it("never treats the debut day as an anniversary", () => {
    expect(next("2025-01-10T00:00:00Z").openAt.toISOString()).toBe("2026-02-23T15:00:00.000Z");
    expect(next("2025-02-23T14:00:00Z").number).toBe(1);
    expect(next("2025-02-24T05:00:00Z").number).toBe(1);
  });

  it("celebrates a Feb 29 debut on Feb 28 in common years and Feb 29 in leap years", () => {
    expect(next("2025-03-01T00:00:00Z", "2024-02-29").openAt.toISOString()).toBe("2026-02-27T15:00:00.000Z"); // 2025 passed: 2026-02-28 KST
    expect(next("2027-03-01T00:00:00Z", "2024-02-29").openAt.toISOString()).toBe("2028-02-28T15:00:00.000Z"); // 2028-02-29 KST
    expect(next("2024-06-01T00:00:00Z", "2024-02-29").openAt.toISOString()).toBe("2025-02-27T15:00:00.000Z"); // 2025-02-28 KST
  });

  it("rejects a malformed or impossible debut date", () => {
    expect(() => nextAnniversary("2025-2-24", 0)).toThrow();
    expect(() => nextAnniversary("2025-02-30", 0)).toThrow();
    expect(() => nextAnniversary("", 0)).toThrow();
  });
});

describe("helpers", () => {
  it("ordinal", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 112].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st", "112th"]);
  });

  it("daysUntil rounds up and never goes negative", () => {
    const open = new Date("2027-02-23T15:00:00Z");
    expect(daysUntil(open, at("2027-02-22T15:00:00Z"))).toBe(1);
    expect(daysUntil(open, at("2027-02-22T14:59:59Z"))).toBe(2);
    expect(daysUntil(open.toISOString(), at("2028-01-01T00:00:00Z"))).toBe(0);
  });

  it("formatDayZoned reads the calendar day in the given zone", () => {
    const open = "2027-02-23T15:00:00Z";
    expect(formatDayZoned(open, KST)).toBe("Feb 24, 2027");
    expect(formatDayZoned(open, ICT)).toBe("Feb 23, 2027");
  });
});
