import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

const NOW = new Date("2026-11-25T00:00:00Z");

describe("buildIcs", () => {
  it("writes a UTC event with CRLF line endings", () => {
    const ics = buildIcs([{ uid: "abc", title: "2nd anniversary", startsAt: new Date("2027-02-23T15:00:00Z"), durationMin: 30 }], NOW);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20270223T150000Z\r\n");
    expect(ics).toContain("DTEND:20270223T153000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261125T000000Z\r\n");
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("escapes text so a title cannot inject calendar properties", () => {
    const ics = buildIcs([{ uid: "x", title: "Live; chat, party\nEND:VEVENT", startsAt: NOW }], NOW);
    expect(ics).toContain("SUMMARY:Live\\; chat\\, party\\nEND:VEVENT\r\n");
    // the injected END:VEVENT stays inside SUMMARY; only the real terminator sits on its own line
    expect(ics.split("\r\n").filter((l) => l === "END:VEVENT")).toHaveLength(1);
  });

  it("folds long lines at 75 octets without splitting a character", () => {
    const ics = buildIcs([{ uid: "x", title: "ฮัทสึ".repeat(30), startsAt: NOW }], NOW);
    const lines = ics.split("\r\n");
    expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`SUMMARY:${"ฮัทสึ".repeat(30)}`);
  });
});
