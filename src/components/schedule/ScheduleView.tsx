"use client";

import { useEffect, useState } from "react";
import type { EventRow, EventType } from "@/lib/db/types";
import { CountdownBadge } from "./CountdownBadge";
import { EventDrawer } from "./EventDrawer";
import {
  dayKey, dayParts, longDate, MON, MONTHS, monthKey, STATUS_STYLE, statusOf, TYPE_LABEL, WD, whereOf, type StatusLabel,
} from "./time";
import s from "./schedule.module.css";

type View = "list" | "cal";
type When = "all" | "up" | "past";

interface Item { event: EventRow; ms: number; status: StatusLabel }

const WHEN: [When, string][] = [["all", "All dates"], ["up", "Upcoming"], ["past", "Past"]];

export function ScheduleView({ events, nowIso }: { events: EventRow[]; nowIso: string }) {
  // Starts from the server's clock (identical HTML on hydration), then switches to the visitor's clock.
  const [now, setNow] = useState(() => Date.parse(nowIso));
  useEffect(() => setNow(Date.now()), []);

  const [view, setView] = useState<View>("list");
  const [when, setWhen] = useState<When>("all");
  const [type, setType] = useState<"all" | EventType>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const items: Item[] = events.map((event) => ({ event, ms: Date.parse(event.starts_at), status: statusOf(event, now) }));
  const upcoming = items.filter((i) => i.status === "Upcoming").sort((a, b) => a.ms - b.ms);
  const next = upcoming[0];
  const lastMs = items.reduce((m, i) => Math.max(m, i.ms), 0);

  const [cal, setCal] = useState(() => {
    const p = dayParts(next?.ms ?? (lastMs || Date.parse(nowIso)));
    return { y: p.y, m: p.m };
  });

  const types = [...new Set(events.map((e) => e.event_type))];
  const shown = items.filter((i) => (type === "all" || i.event.event_type === type) && (when === "all" || (when === "up") === (i.status === "Upcoming")));
  // Upcoming first (soonest on top), then past events newest first.
  const ordered = [
    ...shown.filter((i) => i.status === "Upcoming").sort((a, b) => a.ms - b.ms),
    ...shown.filter((i) => i.status !== "Upcoming").sort((a, b) => b.ms - a.ms),
  ];
  const groups: { key: string; label: string; items: Item[] }[] = [];
  for (const it of ordered) {
    const key = monthKey(it.ms);
    let g = groups[groups.length - 1];
    if (g?.key !== key) {
      const p = dayParts(it.ms);
      g = { key, label: `${MONTHS[p.m]} ${p.y}`, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }

  const selected = items.find((i) => i.event.id === openId) ?? null;
  const tog = <T extends string>(cur: T, set: (v: T) => void, v: T, label: string) => (
    <button key={v} className={s.seg} aria-pressed={cur === v} onClick={() => set(v)}>{label}</button>
  );

  const byDay = new Map<string, Item[]>();
  for (const it of shown) byDay.set(dayKey(it.ms), [...(byDay.get(dayKey(it.ms)) ?? []), it]);
  const lead = new Date(Date.UTC(cal.y, cal.m, 1)).getUTCDay();
  const dim = new Date(Date.UTC(cal.y, cal.m + 1, 0)).getUTCDate();
  const shift = (k: number) => setCal(({ y, m }) => { const t = y * 12 + m + k; return { y: Math.floor(t / 12), m: t % 12 }; });

  return (
    <>
      {next ? (
        <CountdownBadge title={next.event.title} meta={`${whereOf(next.event)} · ${longDate(next.ms)}`} target={next.event.starts_at} />
      ) : (
        <section aria-label="Next event" className={s.countdown}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="chip" style={{ alignSelf: "flex-start", background: "#2B2440", color: "#fff" }}>Next up</span>
            <span className="disp" style={{ fontSize: 30, fontWeight: 600 }}>No upcoming events announced</span>
            <span style={{ fontSize: 15 }}>Check back after the next official notice.</span>
          </div>
        </section>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <div role="group" aria-label="View" className={s.viewToggle}>
            {tog(view, setView, "list", "List")}
            {tog(view, setView, "cal", "Calendar")}
          </div>
          <div role="group" aria-label="When" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {WHEN.map(([v, label]) => tog(when, setWhen, v, label))}
          </div>
        </div>
        {types.length > 1 && (
          <div role="group" aria-label="Event type" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tog<"all" | EventType>(type, setType, "all", "All")}
            {types.map((t) => tog<"all" | EventType>(type, setType, t, TYPE_LABEL[t]))}
          </div>
        )}
      </div>

      {view === "list" && (
        shown.length > 0 ? (
          <section aria-label="Event list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groups.map((g) => (
              <div key={g.key} className={s.group}>
                <h2 className={`disp ${s.mhead}`}>
                  {g.label}{" "}
                  <span style={{ fontSize: 14, color: "var(--ink-500)", fontWeight: 400, fontFamily: "var(--font-plex-kr), sans-serif" }}>
                    · {g.items.length} {g.items.length === 1 ? "event" : "events"}
                  </span>
                </h2>
                {g.items.map(({ event: e, ms, status }) => {
                  const st = STATUS_STYLE[status];
                  const p = dayParts(ms);
                  return (
                    <button key={e.id} className={s.ev} onClick={() => setOpenId(e.id)} style={{ opacity: st.opacity }}
                      aria-label={`${e.title}, ${e.city ?? "city TBA"}, ${longDate(ms)}, ${status}. Open details`}>
                      <span className={s.dateBox} style={{ background: st.dateBg }}>
                        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>{MON[p.m]}</span>
                        <span className="disp" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1 }}>{p.d}</span>
                        <span style={{ fontSize: 12 }}>{WD[p.wd]}</span>
                      </span>
                      <span className={s.evBody}>
                        <span style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 500 }}>{TYPE_LABEL[e.event_type]}</span>
                        <span style={{ fontWeight: 600, fontSize: 17 }}>{e.title}</span>
                        <span style={{ fontSize: 14, color: "var(--ink-500)" }}>{whereOf(e)}</span>
                      </span>
                      <span className={s.evSide}>
                        <span className="chip" style={{ background: st.bg, color: st.fg }}>{status}</span>
                        <svg className={s.evChev} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-500)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        ) : (
          <div className={s.empty}>Nothing announced here yet. Check back after the next official notice.</div>
        )
      )}

      {view === "cal" && (
        <section className={`glass ${s.cal}`} aria-label="Calendar">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="ibtn" onClick={() => shift(-1)} aria-label="Previous month">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <h2 className="disp" aria-live="polite" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{MONTHS[cal.m]} {cal.y}</h2>
            <button className="ibtn" onClick={() => shift(1)} aria-label="Next month">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className={s.grid7} aria-hidden="true" style={{ fontSize: 12, color: "var(--ink-500)", textAlign: "center", fontWeight: 600 }}>
            {WD.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className={s.grid7}>
            {Array.from({ length: lead }, (_, i) => <span key={`o${i}`} className={`${s.day} ${s.dayOut}`} aria-hidden="true" />)}
            {Array.from({ length: dim }, (_, i) => {
              const n = i + 1;
              const evs = byDay.get(`${cal.y}-${String(cal.m + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`) ?? [];
              if (!evs.length) return <span key={n} className={s.day}>{n}</span>;
              const live = evs.some((x) => x.status === "Upcoming");
              return (
                <button key={n} className={`${s.day} ${s.dayHas} ${live ? "" : s.dayPast}`} onClick={() => setOpenId(evs[0].event.id)}
                  aria-label={`${MONTHS[cal.m]} ${n}, ${evs.map((x) => x.event.title).join(", ")}`}>
                  {n}
                  <svg width="8" height="8" viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: 5, marginLeft: -4 }}>
                    <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z" fill={live ? "#C92A68" : "#8A5CE6"} />
                  </svg>
                </button>
              );
            })}
          </div>
          <span className={s.note}>Days with a heart have an event. Click one to open it.</span>
        </section>
      )}

      {selected && <EventDrawer event={selected.event} status={selected.status} onClose={() => setOpenId(null)} />}
    </>
  );
}
