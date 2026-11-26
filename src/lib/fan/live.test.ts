import { describe, expect, it } from "vitest";
import {
  CHEERS_PER_SEC, cooldownRemainingMs, createLimiter, FEED_HIDDEN_MS, FEED_MAX_BACKOFF_MS, FEED_VISIBLE_MS, formatClock, HEARTBEAT_MS,
  isAnonId, isFlood, mergeMessages, ONLINE_WINDOW_SEC, pollDelayMs, refineOffset, roomPhase, secondsLeft, toneColor, toneOf, type FeedMessage,
} from "./live";

describe("polling cadence", () => {
  it("polls every 2 s visible and every 10 s hidden", () => {
    expect(pollDelayMs(true)).toBe(FEED_VISIBLE_MS);
    expect(pollDelayMs(false)).toBe(FEED_HIDDEN_MS);
    expect(FEED_VISIBLE_MS).toBe(2000);
    expect(FEED_HIDDEN_MS).toBe(10_000);
  });
  it("backs off on failures and caps", () => {
    expect(pollDelayMs(true, 1)).toBe(4000);
    expect(pollDelayMs(true, 2)).toBe(8000);
    expect(pollDelayMs(true, 50)).toBe(FEED_MAX_BACKOFF_MS);
    expect(pollDelayMs(false, 3)).toBe(FEED_MAX_BACKOFF_MS);
    expect(pollDelayMs(true, -4)).toBe(FEED_VISIBLE_MS);
  });
  it("beats well inside the 45 s online window (survives one missed beat)", () => {
    expect(HEARTBEAT_MS).toBe(20_000);
    expect(ONLINE_WINDOW_SEC).toBe(45);
    expect(HEARTBEAT_MS * 2).toBeLessThan(ONLINE_WINDOW_SEC * 1000);
  });
});

describe("online window", () => {
  // mirrors app.online_count(): a row counts while seen_at > now() - 45 s
  const counts = (ageSec: number) => ageSec < ONLINE_WINDOW_SEC;
  it("counts rows seen inside the window only", () => {
    expect(counts(0)).toBe(true);
    expect(counts(44)).toBe(true);
    expect(counts(45)).toBe(false);
    expect(counts(120)).toBe(false);
  });
});

describe("room phase", () => {
  const opens = "2027-01-01T00:00:00.000Z", closes = "2027-01-01T02:00:00.000Z";
  const t = (iso: string) => Date.parse(iso);
  it("gates chat by opens_at..closes_at", () => {
    expect(roomPhase(t("2026-12-31T23:59:59Z"), opens, closes)).toBe("before");
    expect(roomPhase(t(opens), opens, closes)).toBe("open");
    expect(roomPhase(t(closes), opens, closes)).toBe("open");
    expect(roomPhase(t("2027-01-01T02:00:01Z"), opens, closes)).toBe("closed");
  });
});

describe("countdown clock", () => {
  it("rounds up and never goes negative", () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_001)).toBe(1);
    expect(secondsLeft(10_000, 10_000)).toBe(0);
    expect(secondsLeft(10_000, 99_000)).toBe(0);
  });
  it("floods at 10 s and below, not before mount", () => {
    expect(isFlood(null)).toBe(false);
    expect(isFlood(11)).toBe(false);
    expect(isFlood(10)).toBe(true);
    expect(isFlood(0)).toBe(true);
  });
  it("formats MM:SS, HH:MM:SS and days", () => {
    expect(formatClock(10)).toEqual({ text: "00:10", size: "lg" });
    expect(formatClock(0)).toEqual({ text: "00:00", size: "lg" });
    expect(formatClock(3599)).toEqual({ text: "59:59", size: "lg" });
    expect(formatClock(3600)).toEqual({ text: "01:00:00", size: "md" });
    expect(formatClock(99 * 3600 + 59 * 60 + 59)).toEqual({ text: "99:59:59", size: "md" });
    expect(formatClock(100 * 3600)).toEqual({ text: "4d 04:00:00", size: "sm" });
    expect(formatClock(5 * 86_400 + 3 * 3600 + 4 * 60 + 5)).toEqual({ text: "5d 03:04:05", size: "sm" });
    expect(formatClock(-5).text).toBe("00:00");
  });
});

describe("slow-mode cooldown", () => {
  it("is zero before any send and after the window", () => {
    expect(cooldownRemainingMs(null, 5, 1000)).toBe(0);
    expect(cooldownRemainingMs(1000, 5, 6000)).toBe(0);
    expect(cooldownRemainingMs(1000, 5, 7000)).toBe(0);
  });
  it("counts down inside the window", () => {
    expect(cooldownRemainingMs(1000, 5, 1000)).toBe(5000);
    expect(cooldownRemainingMs(1000, 5, 3500)).toBe(2500);
    expect(Math.ceil(cooldownRemainingMs(1000, 5, 5100) / 1000)).toBe(1);
  });
  it("slow mode 0 never blocks", () => {
    expect(cooldownRemainingMs(1000, 0, 1000)).toBe(0);
  });
});

describe("clock offset refinement", () => {
  it("takes the midpoint of the request", () => {
    // server said 10_000 while the browser sent at 1000 and got it at 1100 => browser midpoint 1050
    expect(refineOffset(null, 10_000, 1000, 1100)).toEqual({ offset: 8950, rtt: 100 });
  });
  it("keeps the sample with the smallest round trip", () => {
    const first = refineOffset(null, 10_000, 1000, 1400); // rtt 400
    const better = refineOffset(first, 20_000, 11_000, 11_050); // rtt 50
    expect(better.rtt).toBe(50);
    const worse = refineOffset(better, 30_000, 21_000, 21_900);
    expect(worse).toBe(better);
  });
  it("replaces the page-render estimate (uncertainty 5 s) on the first poll", () => {
    const initial = { offset: 123, rtt: 5000 };
    expect(refineOffset(initial, 10_000, 1000, 1200).rtt).toBe(200);
  });
});

describe("cheer limiter", () => {
  it("allows 5 per second per key, then refuses, then recovers", () => {
    const l = createLimiter(CHEERS_PER_SEC, 1000);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(l.allow("u1", t0 + i * 10)).toBe(true);
    expect(l.allow("u1", t0 + 100)).toBe(false);
    expect(l.allow("u2", t0 + 100)).toBe(true); // other users are unaffected
    expect(l.allow("u1", t0 + 1001)).toBe(true); // the first hit slid out of the window
  });
});

describe("ids and messages", () => {
  it("validates the anonymous id", () => {
    expect(isAnonId("3f2b8a1c-9d4e-4f6a-8b1c-2d3e4f5a6b7c")).toBe(true);
    expect(isAnonId("short")).toBe(false);
    expect(isAnonId("has space has space")).toBe(false);
    expect(isAnonId("'; drop table x;--")).toBe(false);
    expect(isAnonId(null)).toBe(false);
    expect(isAnonId("a".repeat(65))).toBe(false);
  });
  it("derives a stable palette index from a user id", () => {
    expect(toneOf("abc")).toBe(toneOf("abc"));
    expect(toneColor(toneOf("5b1f0a3e-0000-4000-8000-000000000001"))).toMatch(/^#[0-9A-F]{6}$/);
    expect(toneColor(-7)).toMatch(/^#[0-9A-F]{6}$/);
  });
  const m = (id: number): FeedMessage => ({ id, name: "n", body: `b${id}`, at: "2027-01-01T00:00:00Z", tone: 0 });
  it("merges by id, de-duplicates and keeps order", () => {
    const a = [m(1), m(2)];
    expect(mergeMessages(a, [])).toBe(a);
    expect(mergeMessages(a, [m(2)])).toBe(a);
    expect(mergeMessages(a, [m(4), m(3)]).map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });
  it("trims to the newest `max`", () => {
    const a = [m(1), m(2), m(3)];
    expect(mergeMessages(a, [m(4)], 3).map((x) => x.id)).toEqual([2, 3, 4]);
  });
});
