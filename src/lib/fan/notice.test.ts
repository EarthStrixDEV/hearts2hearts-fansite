import { describe, expect, it } from "vitest";
import { formatZoned, ICT, KST } from "./time";
import {
  extractJsonArray, googleCalendarUrl, kstToUtcIso, needsCheck, noticeTitle, parseNoticeReply, remindAt, sniffNoticeImage,
} from "./notice";

describe("kstToUtcIso", () => {
  it("converts Korea wall-clock time to UTC (KST is UTC+9) and on to Thai time (UTC+7)", () => {
    const utc = kstToUtcIso("2026-12-05T17:00");
    expect(utc).toBe("2026-12-05T08:00:00.000Z");
    expect(formatZoned(utc!, KST)).toBe("Dec 5, 2026, 17:00");
    expect(formatZoned(utc!, ICT)).toBe("Dec 5, 2026, 15:00"); // two hours behind Korea
  });

  it("crosses the day boundary in both directions", () => {
    const early = kstToUtcIso("2026-12-05T01:30")!;
    expect(early).toBe("2026-12-04T16:30:00.000Z");
    expect(formatZoned(early, ICT)).toBe("Dec 4, 2026, 23:30"); // Thai date is the day before
    expect(kstToUtcIso("2027-01-01T00:00")).toBe("2026-12-31T15:00:00.000Z"); // year boundary
  });

  it("accepts a space separator and seconds, rejects anything that is not a real time", () => {
    expect(kstToUtcIso("2026-12-05 17:00:00")).toBe("2026-12-05T08:00:00.000Z");
    for (const bad of ["TBA", "", "2026-02-30T10:00", "2026-12-05T25:00", "2026-12-05T10:61", "2026-13-01T10:00", "17:00", null, undefined]) {
      expect(kstToUtcIso(bad as string | null | undefined), String(bad)).toBeNull();
    }
    expect(kstToUtcIso("2028-02-29T10:00")).not.toBeNull(); // leap day is real
    expect(kstToUtcIso("2027-02-29T10:00")).toBeNull();
  });
});

describe("parseNoticeReply", () => {
  const good = [
    { title_ko: "음악방송 1위 앵콜", title_th: "เวทีรายการเพลง", starts_at_kst: "2026-12-05T17:00", confidence: 0.95 },
    { title_ko: "라이브 방송", title_th: "ไลฟ์สด", starts_at_kst: null, confidence: 0.9 },
  ];

  it("validates the JSON, converts KST to UTC and keeps the shape stored in notice_jobs.result", () => {
    const items = parseNoticeReply(JSON.stringify(good));
    expect(items).toEqual([
      { title_ko: "음악방송 1위 앵콜", title_th: "เวทีรายการเพลง", starts_at: "2026-12-05T08:00:00.000Z", confidence: 0.95 },
      { title_ko: "라이브 방송", title_th: "ไลฟ์สด", starts_at: null, confidence: 0.9 },
    ]);
  });

  it("tolerates a code fence and chatter around the array", () => {
    const text = `Here you go:\n\`\`\`json\n${JSON.stringify(good)}\n\`\`\`\nHope it helps!`;
    expect(parseNoticeReply(text)).toHaveLength(2);
    expect(extractJsonArray(`result: ${JSON.stringify(good)}`)).toHaveLength(2);
  });

  it("returns an empty list for a notice with no events", () => {
    expect(parseNoticeReply("[]")).toEqual([]);
  });

  it("an unreadable time becomes null and drops the confidence under the check threshold", () => {
    const [i] = parseNoticeReply(JSON.stringify([{ title_ko: "a", title_th: "b", starts_at_kst: "TBA", confidence: 0.99 }]));
    expect(i.starts_at).toBeNull();
    expect(i.confidence).toBeLessThan(0.7);
  });

  it.each([
    ["not json", "sorry, I cannot read this"],
    ["an object, not an array", '{"title_ko":"a"}'],
    ["a missing field", JSON.stringify([{ title_ko: "a", starts_at_kst: null, confidence: 0.5 }])],
    ["confidence above 1", JSON.stringify([{ title_ko: "a", title_th: "b", starts_at_kst: null, confidence: 1.5 }])],
    ["confidence as a string", JSON.stringify([{ title_ko: "a", title_th: "b", starts_at_kst: null, confidence: "high" }])],
    ["a truncated array", '[{"title_ko":"a","title_th":"b","starts_at_kst":null,"confid'],
  ])("throws on %s (the job is marked failed, never half-stored)", (_n, text) => {
    expect(() => parseNoticeReply(text)).toThrow();
  });

  it("refuses an absurd number of items", () => {
    const many = Array.from({ length: 41 }, () => ({ title_ko: "a", title_th: "b", starts_at_kst: null, confidence: 1 }));
    expect(() => parseNoticeReply(JSON.stringify(many))).toThrow();
  });
});

describe("needsCheck", () => {
  it("flags low confidence or a missing time", () => {
    expect(needsCheck({ starts_at: "2026-12-05T08:00:00.000Z", confidence: 0.7 })).toBe(false);
    expect(needsCheck({ starts_at: "2026-12-05T08:00:00.000Z", confidence: 0.69 })).toBe(true);
    expect(needsCheck({ starts_at: null, confidence: 1 })).toBe(true);
  });
});

describe("sniffNoticeImage", () => {
  const pad = (...b: number[]) => Uint8Array.from([...b, ...new Array(16).fill(0)]);
  it("recognises png, jpeg and webp by their bytes", () => {
    expect(sniffNoticeImage(pad(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe("image/png");
    expect(sniffNoticeImage(pad(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe("image/jpeg");
    expect(sniffNoticeImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.mime).toBe("image/webp");
  });
  it("rejects gif, svg, html and a RIFF file that is not webp", () => {
    expect(sniffNoticeImage(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffNoticeImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffNoticeImage(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(sniffNoticeImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]))).toBeNull(); // WAVE
    expect(sniffNoticeImage(new Uint8Array(0))).toBeNull();
  });
});

describe("remindAt", () => {
  const start = "2026-12-05T08:00:00.000Z";
  const now = Date.parse("2026-12-05T06:00:00Z");
  it("fires 1 hour and 15 minutes before, and at the start for voting", () => {
    expect(remindAt("1h", start, now)).toBe("2026-12-05T07:00:00.000Z");
    expect(remindAt("15m", start, now)).toBe("2026-12-05T07:45:00.000Z");
    expect(remindAt("vote", start, now)).toBe(start);
  });
  it("returns null when the moment has already passed", () => {
    const late = Date.parse("2026-12-05T07:30:00Z");
    expect(remindAt("1h", start, late)).toBeNull();
    expect(remindAt("15m", start, late)).toBe("2026-12-05T07:45:00.000Z");
    expect(remindAt("vote", start, Date.parse("2026-12-05T09:00:00Z"))).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("builds a Google Calendar template link in UTC", () => {
    const url = new URL(googleCalendarUrl("Fansign; Seoul", "2026-12-05T08:00:00.000Z", 90));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Fansign; Seoul");
    expect(url.searchParams.get("dates")).toBe("20261205T080000Z/20261205T093000Z");
  });
  it("titles fall back from Thai to Korean to a label", () => {
    expect(noticeTitle({ title_ko: "가", title_th: "ก" })).toBe("ก");
    expect(noticeTitle({ title_ko: "가", title_th: " " })).toBe("가");
    expect(noticeTitle({ title_ko: "", title_th: "" })).toBe("Untitled event");
  });
});
