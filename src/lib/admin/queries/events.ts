import "server-only";
import type { EventRow } from "@/lib/db/types";
import { query, queryOne, hasDb } from "@/lib/neon/db";
import { cleanQ } from "../db";
import { EVENT_COLS, likeOf, Where } from "../sql";

export async function listEvents(q?: string, when?: string): Promise<EventRow[]> {
  if (!hasDb()) return [];
  const w = new Where();
  if (when === "up") w.add("starts_at >= now()");
  if (when === "past") w.add("starts_at < now()");
  const s = cleanQ(q);
  if (s) w.add("(title ilike ? or city ilike ? or venue ilike ?)", likeOf(s));
  return query<EventRow>(`select ${EVENT_COLS} from events ${w.clause} order by starts_at ${when === "up" ? "asc" : "desc"} limit 300`, w.params);
}

export async function getEvent(id: string): Promise<EventRow | null> {
  if (!hasDb() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<EventRow>(`select ${EVENT_COLS} from events where id = $1`, [id]);
}
