// Seed = EVENTS from design/project/Schedule.dc.html. Date-only events are stored at 00:00 KST, which the UI reads as
// "time TBA" (see isTimeTba in src/components/schedule/time.ts). Design placeholders ([VENUE], [CITY]) become null.
import type { EventRow } from "../types";

const e = (n: number, title: string, event_type: EventRow["event_type"], city: string | null, venue: string | null, date: string): EventRow => ({
  id: `seed-event-${n}`,
  title,
  event_type,
  starts_at: `${date}T00:00:00+09:00`,
  ends_at: null,
  venue,
  city,
  country: null,
  ticket_url: null,
  poster_id: null,
  is_cancelled: false,
  status: "published",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  updated_by: null,
});

export const SEED_EVENTS: EventRow[] = [
  // Placeholder from the design (props.nextEventAt = 2026-12-20T18:00:00+09:00): the next official event is not announced.
  { ...e(0, "[NEXT OFFICIAL EVENT]", "concert", null, null, "2026-12-20"), starts_at: "2026-12-20T18:00:00+09:00" },
  e(1, "Hearts2House 2026", "concert", "Jakarta", "Tennis Indoor Senayan", "2026-03-28"),
  e(2, "Hearts2House 2026", "concert", "Los Angeles", "The Wiltern", "2026-03-22"),
  e(3, "Hearts2House 2026", "concert", "Brooklyn, NY", "Brooklyn Paramount", "2026-03-19"),
  e(4, "Hearts2House 2026 · Day 2", "concert", "Seoul", "Olympic Hall", "2026-02-22"),
  e(5, "Hearts2House 2026 · Day 1", "concert", "Seoul", "Olympic Hall", "2026-02-21"),
  e(6, "SMTOWN LIVE 2025–26", "concert", "Bangkok", null, "2026-02-14"),
  e(7, "SMTOWN LIVE 2025–26", "concert", "Fukuoka", null, "2026-01-31"),
  e(8, "Focus showcase", "other", "Seoul", "Blue Square SOL Travel Hall", "2025-10-20"),
  e(9, "SMTOWN LIVE 2025–26", "concert", "Tokyo", null, "2025-08-09"),
  e(10, "SMTOWN LIVE 2025–26", "concert", "London", null, "2025-06-28"),
  e(11, "SMTOWN LIVE 2025–26", "concert", "Los Angeles", null, "2025-05-11"),
  e(12, "SMTOWN LIVE 2025–26", "concert", "Mexico City", null, "2025-05-09"),
  e(13, "Debut showcase “Chase Our Hearts”", "other", "Seoul", "Yes24 Live Hall", "2025-02-24"),
].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
