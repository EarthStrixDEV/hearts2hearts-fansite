"use server";

import { withActor } from "@/lib/neon/db";
import { gate } from "../auth";
import { dbError, fail, flag, isUrl, isUuid, ok, orNull, statusOf, str, validTz, zonedToUtcISO } from "../form";
import { revalidateTags } from "../revalidate";
import { insertSql, updateSql } from "../sql";
import type { ActionState } from "../types";

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const TYPES = ["concert", "fanmeet", "broadcast", "release", "other"];

export async function saveEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);

  const id = str(fd, "id");
  if (id && !isUuid(id)) return fail("Invalid event.");
  const title = str(fd, "title");
  const tz = str(fd, "tz");
  const start = str(fd, "starts_at");
  const end = str(fd, "ends_at");
  const ticket = str(fd, "ticket_url");
  const poster = str(fd, "poster_id");
  const type = str(fd, "event_type");

  const missing = [!title && "event name", !LOCAL.test(start) && "start date and time", !str(fd, "city") && "city", !str(fd, "venue") && "venue"].filter(Boolean);
  if (missing.length) return fail(`Still needed: ${missing.join(", ")}.`);
  if (!validTz(tz)) return fail("Pick a venue timezone.");
  if (!TYPES.includes(type)) return fail("Pick an event type.");
  if (end && !LOCAL.test(end)) return fail("End time must be a valid date and time.");
  if (ticket && !isUrl(ticket)) return fail("Ticket link must start with http(s)://");

  const startsAt = zonedToUtcISO(start, tz);
  const endsAt = end ? zonedToUtcISO(end, tz) : null;
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) return fail("The end time is before the start time.");

  const row = {
    title,
    event_type: type,
    starts_at: startsAt,
    ends_at: endsAt,
    venue: orNull(fd, "venue"),
    city: orNull(fd, "city"),
    country: orNull(fd, "country"),
    ticket_url: ticket || null,
    poster_id: isUuid(poster) ? poster : null,
    is_cancelled: flag(fd, "is_cancelled"),
    status: statusOf(fd),
    updated_by: g.userId,
  };
  try {
    const { text, params } = id ? updateSql("events", row, id, "id") : insertSql("events", row, "id");
    const [saved] = await withActor(g.userId, (q) => q<{ id: string }>(text, params));
    if (!saved) return fail("That event no longer exists.");
    revalidateTags(["home", "events"]);
    const verb = row.status === "published" ? "published" : row.status === "archived" ? "archived" : "saved as draft";
    return ok(`${title} ${verb}`, `/admin/events?id=${saved.id}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing to delete.");
  try {
    await withActor(g.userId, (q) => q(`delete from events where id = $1`, [id]));
    revalidateTags(["home", "events"]);
    return ok("Event deleted", "/admin/events");
  } catch (e) {
    return fail(dbError(e));
  }
}
