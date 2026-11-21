import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import type { EventRow } from "./types";
import { SEED_EVENTS } from "./seed/events";

// pg returns timestamptz as Date; to_json(...)#>>'{}' keeps them as ISO strings (EventRow contract).
const iso = (col: string) => `to_json(${col}) #>> '{}'`;

const loadEvents = unstable_cache(
  async (): Promise<EventRow[]> =>
    query<{ [K in keyof EventRow]: EventRow[K] }>(
      `select id, title, event_type, ${iso("starts_at")} as starts_at, ${iso("ends_at")} as ends_at,
              venue, city, country, ticket_url, poster_id, is_cancelled, status,
              ${iso("created_at")} as created_at, ${iso("updated_at")} as updated_at, updated_by
         from events
        where status = 'published'
        order by starts_at`,
    ),
  ["events-all"],
  { tags: ["events"], revalidate: 3600 },
);

/** All published events, oldest first (page splits upcoming/past). Cache tag `events`; seed when no database is configured. */
export async function getEvents(): Promise<EventRow[]> {
  return hasDb() ? loadEvents() : SEED_EVENTS;
}
