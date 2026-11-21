"use client";

import { useEffect, useRef } from "react";
import type { EventRow } from "@/lib/db/types";
import { buildIcs, isTimeTba, longDate, STATUS_STYLE, TYPE_LABEL, type StatusLabel } from "./time";
import s from "./schedule.module.css";

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const isHttp = (u: string | null): u is string => !!u && /^https?:\/\//i.test(u);

function downloadIcs(e: EventRow) {
  const url = URL.createObjectURL(new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "event"}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Modal detail view: closes on Escape / backdrop, traps Tab, locks page scroll and restores focus on close. */
export function EventDrawer({ event, status, onClose }: { event: EventRow; status: StatusLabel; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const st = STATUS_STYLE[status];
  const live = status === "Upcoming";
  const start = Date.parse(event.starts_at);
  const tba = isTimeTba(event);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const [firstEl, lastEl] = [items[0], items[items.length - 1]];
    if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
  };

  let tz = "your timezone";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch { /* keep generic label */ }
  const localTime = new Date(start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const row = { display: "flex", gap: 12 } as const;
  const dt = { width: 72, color: "var(--ink-500)", flex: "none" } as const;

  return (
    <div className={s.wrapDrawer} onClick={onClose}>
      <div ref={ref} className={s.drawer} role="dialog" aria-modal="true" aria-label={`${event.title} details`} onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div style={{ aspectRatio: "4 / 3", background: st.poster, position: "relative", flex: "none" }}>
          <button data-autofocus className="ibtn" onClick={onClose} aria-label="Close details" style={{ position: "absolute", right: 16, top: 16, background: "rgba(255,255,255,.88)", color: "#2B2440" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="chip" style={{ background: st.bg, color: st.fg }}>{status}</span>
            <span className="chip" style={{ background: "var(--line)", color: "var(--ink-900)" }}>{TYPE_LABEL[event.event_type]}</span>
          </div>
          <span className="disp" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.15 }}>{event.title}</span>
          <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
            <div style={row}><dt style={dt}>Date</dt><dd style={{ margin: 0, fontWeight: 600 }}>{longDate(start)}</dd></div>
            <div style={row}><dt style={dt}>Time</dt><dd style={{ margin: 0 }}>{tba ? `TBA · will show in ${tz}` : localTime}</dd></div>
            <div style={row}><dt style={dt}>Venue</dt><dd style={{ margin: 0 }}>{[event.venue ?? "Venue TBA", event.city].filter(Boolean).join(", ")}</dd></div>
          </dl>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {live && isHttp(event.ticket_url) ? (
              <a className="btn btn-p" href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>Tickets</a>
            ) : (
              <span className="btn btn-p" role="link" aria-disabled="true" style={{ flex: 1 }}>Tickets</span>
            )}
            <button className="btn btn-s" disabled={!live} onClick={() => downloadIcs(event)} style={{ flex: 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4M12 13v4M10 15h4" /></svg>
              Add to Calendar
            </button>
          </div>
          <span className={s.note} style={{ fontSize: 12 }}>Ticket link comes from the official notice. Past and cancelled events keep both disabled.</span>
        </div>
      </div>
    </div>
  );
}
