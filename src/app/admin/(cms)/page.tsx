import Link from "next/link";
import { Badge, PageHead, type Tone } from "@/components/admin/ui";
import { fmtDate, fmtDateTime, PUBLISH_TZ } from "@/lib/admin/form";
import { getDashboard } from "@/lib/admin/queries/dashboard";

export const metadata = { title: "Dashboard" };

const JOB_TONE: Record<string, Tone> = { pending: "acc", drafted: "acc", approved: "ok", rejected: "neu", failed: "bad" };

export default async function AdminDashboard() {
  const d = await getDashboard();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: PUBLISH_TZ });
  const next = d.nextEvents[0];
  const stats = [
    { label: "Members", value: d.counts.members, note: "profiles in the CMS", href: "/admin/members" },
    { label: "Releases", value: d.counts.albums, note: "EPs, singles and albums", href: "/admin/music" },
    { label: "Published posts", value: d.counts.published, note: `${d.counts.drafts} ${d.counts.drafts === 1 ? "draft" : "drafts"} waiting`, href: "/admin/posts" },
    { label: "Events", value: d.counts.upcoming, note: d.counts.upcoming ? "upcoming" : "0 upcoming · add from official notices", href: "/admin/events" },
  ];

  return (
    <>
      <PageHead
        title="Dashboard"
        desc={`Hearts2Hearts site · ${today}`}
        actions={
          <>
            <Link href="/admin/events?new=1" className="a-btn">Add event</Link>
            <Link href="/admin/posts" className="a-btn a-btn-p">Review drafts ({d.counts.drafts})</Link>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 16 }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="a-card a-stat">
            <span className="a-sub" style={{ fontWeight: 500 }}>{s.label}</span>
            <strong>{s.value}</strong>
            <span className="a-sub" style={{ fontSize: 12 }}>{s.note}</span>
          </Link>
        ))}
      </div>

      <div className="a-split">
        <div className="a-grow a-stack" style={{ gap: 20 }}>
          <section className="a-card" aria-labelledby="rv" style={{ paddingBottom: 8 }}>
            <div className="a-cardhead">
              <h2 id="rv">Needs your review</h2>
              <Badge tone="acc">{d.counts.drafts} drafts</Badge>
            </div>
            {d.review.length === 0 && <p className="a-empty" style={{ borderTop: "1px solid var(--line)" }}>Nothing waiting. New AI and human drafts show up here.</p>}
            {d.review.map((r) => (
              <div key={r.id} className="a-list-row">
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="a-ellipsis" style={{ fontWeight: 600 }}>{r.title}</span>
                  <span className="a-cluster">
                    <Badge tone={r.source === "ai" ? "acc" : "neu"}>{r.source === "ai" ? "AI draft" : "Draft"}</Badge>
                    <span className="a-sub" style={{ fontSize: 12 }}>{fmtDateTime(r.created_at)}</span>
                  </span>
                </div>
                <Link href={`/admin/posts?id=${r.id}`} className="a-btn">Review</Link>
              </div>
            ))}
          </section>

          <section className="a-card" aria-labelledby="vf" style={{ paddingBottom: 8 }}>
            <div className="a-cardhead" style={{ flexWrap: "wrap" }}>
              <h2 id="vf">Data to verify</h2>
              <span className="a-sub" style={{ fontSize: 12 }}>Fields still empty in the CMS</span>
            </div>
            {d.verify.length === 0 && <p className="a-empty" style={{ borderTop: "1px solid var(--line)" }}>Connect the database to see data completeness.</p>}
            {d.verify.map((v) => (
              <div key={v.field} className="a-verify">
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 500 }}>{v.field}</span>
                  <span className="a-sub" style={{ fontSize: 12 }}>{v.where}</span>
                </span>
                <div className="a-bar" aria-hidden="true" style={{ width: "100%" }}><span style={{ width: `${v.total ? Math.round((v.done / v.total) * 100) : 0}%` }} /></div>
                <span className="a-mono a-sub" style={{ textAlign: "right" }}>{v.done}/{v.total}</span>
                <Link href={v.href} className="a-btn a-btn-sm">Fix</Link>
              </div>
            ))}
          </section>
        </div>

        <div className="a-aside a-stack" style={{ gap: 20, flexBasis: 320 }}>
          <section className="a-card a-pad a-stack" aria-labelledby="job" style={{ gap: 14 }}>
            <div className="a-row"><h2 id="job" className="a-cardhead" style={{ padding: 0, fontSize: 16, fontWeight: 600 }}>AI daily post</h2>
              {d.job ? <Badge tone={JOB_TONE[d.job.state] ?? "neu"}>{d.job.state}</Badge> : <Badge>No runs yet</Badge>}
            </div>
            <dl className="a-dl">
              <dt>Schedule</dt><dd>Every day · 09:00 Asia/Bangkok</dd>
              <dt>Last run</dt><dd>{d.job ? fmtDate(d.job.run_date) : "—"}</dd>
              <dt>Model</dt><dd className="a-mono">{d.job?.model ?? "—"}</dd>
              <dt>Publishing</dt><dd>Human review required</dd>
            </dl>
            {d.job?.error && <div className="a-banner" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>{d.job.error}</div>}
            <Link href="/admin/settings" className="a-btn">Generator settings</Link>
          </section>

          <section className="a-card a-pad a-stack" aria-labelledby="ue" style={{ gap: 12 }}>
            <div className="a-row"><h2 id="ue" style={{ fontSize: 16, fontWeight: 600 }}>Upcoming events</h2><Link href="/admin/events" style={{ fontSize: 13, fontWeight: 600 }}>Open schedule</Link></div>
            {next ? (
              d.nextEvents.map((e) => (
                <Link key={e.id} href={`/admin/events?id=${e.id}`} style={{ textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{e.title}</span>
                  <span className="a-sub">{fmtDateTime(e.starts_at)} · {[e.city, e.venue].filter(Boolean).join(" · ") || "Venue TBA"}</span>
                </Link>
              ))
            ) : (
              <div style={{ padding: 14, borderRadius: 10, border: "1px dashed var(--line)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>No upcoming events</span>
                <span className="a-sub">Add one from an official notice.</span>
              </div>
            )}
            <span className="a-sub" style={{ fontSize: 12 }}>Last past event: {d.lastPast ? `${d.lastPast.title} · ${fmtDate(d.lastPast.starts_at)}` : "—"}</span>
          </section>

          <section className="a-card a-pad a-stack" aria-labelledby="act" style={{ gap: 10 }}>
            <h2 id="act" style={{ fontSize: 16, fontWeight: 600 }}>Recent activity</h2>
            {d.activity.length === 0 && <p className="a-sub">No activity yet.</p>}
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {d.activity.map(({ entry, actor }) => (
                <li key={entry.id} style={{ display: "flex", gap: 10, lineHeight: 1.45 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--acc)", marginTop: 6, flex: "none" }} />
                  <span style={{ flex: 1, fontSize: 13 }}>
                    <strong style={{ fontWeight: 600 }}>{actor}</strong> {entry.action} {entry.entity.replace(/_/g, " ")}
                    <span className="a-sub" style={{ display: "block", fontSize: 12 }}>{fmtDateTime(entry.created_at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
