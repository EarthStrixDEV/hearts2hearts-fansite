// Minimal RFC 5545 writer for one-off events. Times are UTC (DTSTART:...Z), so every calendar app converts them itself.

export interface IcsEvent {
  uid: string;
  title: string;
  startsAt: Date;
  durationMin?: number;
  description?: string;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/** TEXT values: backslash, semicolon, comma and newlines are escaped. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets are folded: CRLF + one space, never inside a multi-byte character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//H2H-S2U//Fan club//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@h2h-s2u`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(e.startsAt)}`,
      `DTEND:${stamp(new Date(e.startsAt.getTime() + (e.durationMin ?? 60) * 60_000))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
