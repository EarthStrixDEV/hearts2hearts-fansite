import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { DeleteForm, SaveBar } from "@/components/admin/SaveBar";
import { Badge, Field, MediaSelect, PageHead, SearchForm, Seg, StatusBadge } from "@/components/admin/ui";
import { deleteEvent, saveEvent } from "@/lib/admin/actions/events";
import { getAdminContext } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { fmtDateTime, PUBLISH_TZ, utcToZonedLocal } from "@/lib/admin/form";
import { getEvent, listEvents } from "@/lib/admin/queries/events";
import { mediaOptions } from "@/lib/admin/queries/media";
import { href } from "@/lib/admin/url";

export const metadata = { title: "Schedule" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const WHEN = [["all", "All"], ["up", "Upcoming"], ["past", "Past"]] as const;
const TYPES: Record<string, string> = { concert: "Concert", fanmeet: "Fan meeting", broadcast: "Broadcast", release: "Release", other: "Other" };
const TZS = ["Asia/Bangkok", "Asia/Seoul", "Asia/Tokyo", "Asia/Jakarta", "Asia/Hong_Kong", "America/New_York", "America/Los_Angeles", "America/Mexico_City", "Europe/London", "UTC"];

export default async function AdminEvents({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q), when = one(sp.when) ?? "all", id = one(sp.id), isNew = one(sp.new) === "1";
  const ctx = await getAdminContext();
  const [rows, selected, media] = await Promise.all([listEvents(q, when), id ? getEvent(id) : null, mediaOptions()]);
  const e = selected;
  const showForm = isNew || !!e;
  const keep = { q, when: when === "all" ? undefined : when };
  const now = Date.now();

  return (
    <>
      <PageHead
        title="Schedule"
        desc="Concerts, fan meetings, broadcasts and releases on /schedule. Add an event from an official notice."
        actions={<Link href={href("/admin/events", { ...keep, new: "1" })} className="a-btn a-btn-p" aria-disabled={!ctx.configured}>Add event</Link>}
      />
      <div className="a-cluster" style={{ justifyContent: "space-between" }}>
        <Seg label="When" items={WHEN.map(([k, l]) => ({ label: l, on: when === k, href: href("/admin/events", { q, when: k === "all" ? undefined : k }) }))} />
        <SearchForm q={q} hidden={{ when: keep.when }} placeholder="Search events" />
      </div>

      <div className="a-split">
        <section className="a-card a-scroll a-grow" aria-label="Events" style={{ flexBasis: 560 }}>
          <table className="a-tbl">
            <thead><tr><th scope="col">Event</th><th scope="col">Date ({PUBLISH_TZ.split("/")[1]})</th><th scope="col">Type</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const up = Date.parse(r.starts_at) >= now;
                return (
                  <tr key={r.id} className={r.id === id ? "sel" : undefined}>
                    <td>
                      <Link href={href("/admin/events", { ...keep, id: r.id })} className="a-rowlink" aria-label={`Edit ${r.title}`} style={{ alignItems: "flex-start", flexDirection: "column", gap: 2 }}>
                        <span>{r.title}</span>
                        <span className="a-sub" style={{ fontSize: 12, fontWeight: 400 }}>{[r.city, r.venue].filter(Boolean).join(" · ") || "Venue TODO"}</span>
                      </Link>
                    </td>
                    <td className="a-mono" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{fmtDateTime(r.starts_at)}</td>
                    <td><Badge>{TYPES[r.event_type] ?? r.event_type}</Badge></td>
                    <td>
                      <span className="a-cluster" style={{ gap: 6 }}>
                        {r.is_cancelled ? <Badge tone="bad">Cancelled</Badge> : <Badge tone={up ? "acc" : "neu"}>{up ? "Upcoming" : "Past"}</Badge>}
                        <StatusBadge status={r.status} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="a-empty">{ctx.configured ? "No events match. Add one from an official notice." : "No data yet. Connect the database to manage the schedule."}</p>}
        </section>

        <section className="a-card a-pad a-aside" aria-labelledby="fh" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!showForm ? (
            <p className="a-empty" style={{ padding: 8 }}>{id ? "That event no longer exists." : "Select an event to edit, or add a new one."}</p>
          ) : (
            <>
              <div className="a-row"><h2 id="fh" className="a-h2">{e ? "Edit event" : "New event"}</h2>{e ? <StatusBadge status={e.status} /> : <Badge tone="warn">New</Badge>}</div>
              <ActionForm key={`${e?.id ?? "new"}:${e?.updated_at ?? ""}`} action={saveEvent} readOnly={!ctx.configured} className="a-stack">
                <input type="hidden" name="id" value={e?.id ?? ""} />
                <Field label="Event name *"><input name="title" required defaultValue={e?.title} placeholder="e.g. tour or fan meeting title" className="a-inp" /></Field>
                <div className="a-g3">
                  <Field label="Type">
                    <select name="event_type" defaultValue={e?.event_type ?? "concert"} className="a-inp">
                      {Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="City *"><input name="city" required defaultValue={e?.city ?? ""} className="a-inp" /></Field>
                  <Field label="Country"><input name="country" defaultValue={e?.country ?? ""} className="a-inp" /></Field>
                  <Field label="Venue *" className="a-full"><input name="venue" required defaultValue={e?.venue ?? ""} className="a-inp" /></Field>
                </div>
                <div className="a-g2">
                  <Field label="Timezone" hint="Times below are entered in this timezone and stored as UTC. Visitors see their own timezone.">
                    <select name="tz" defaultValue={PUBLISH_TZ} className="a-inp">{TZS.map((z) => <option key={z}>{z}</option>)}</select>
                  </Field>
                  <span />
                  <Field label="Starts *"><input name="starts_at" type="datetime-local" required defaultValue={utcToZonedLocal(e?.starts_at, PUBLISH_TZ)} className="a-inp" /></Field>
                  <Field label="Ends"><input name="ends_at" type="datetime-local" defaultValue={utcToZonedLocal(e?.ends_at, PUBLISH_TZ)} className="a-inp" /></Field>
                </div>
                <Field label="Ticket link"><input name="ticket_url" type="url" defaultValue={e?.ticket_url ?? ""} placeholder="https://…" className="a-inp" /></Field>
                <MediaSelect name="poster_id" label="Poster" value={e?.poster_id} options={media} />
                <label className="a-check"><input type="checkbox" name="is_cancelled" defaultChecked={e?.is_cancelled} />Event is cancelled</label>
                <SaveBar status={e?.status} isNew={!e} previewHref={e?.status === "published" ? "/schedule" : null} />
              </ActionForm>
              {e && <DeleteForm action={deleteEvent} id={e.id} what="event" readOnly={!ctx.configured} />}
            </>
          )}
        </section>
      </div>
    </>
  );
}
