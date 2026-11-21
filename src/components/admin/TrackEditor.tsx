"use client";

import { useRef, useState } from "react";

export interface TrackDraft { id?: string; title: string; duration: string; title_track: boolean }
type Row = TrackDraft & { k: number };

const Ico = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
);

/** Tracklist rows (title, m:ss, title-track star, reorder, remove). Serialised into the hidden `tracks_json` field. */
export function TrackEditor({ initial }: { initial: TrackDraft[] }) {
  const seq = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(() => initial.map((t, i) => ({ ...t, k: i })));
  const patch = (k: number, p: Partial<TrackDraft>) => setRows((r) => r.map((x) => (x.k === k ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const a = r.slice();
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });

  return (
    <div className="a-stack-s">
      <input type="hidden" name="tracks_json" value={JSON.stringify(rows.map(({ k: _k, ...t }) => t))} />
      {rows.length === 0 && <p className="a-hint">No tracks yet. Add the tracklist from an official source.</p>}
      {rows.map((t, i) => (
        <div className="a-trk" key={t.k}>
          <span className="a-mono a-sub" style={{ textAlign: "center" }}>{i + 1}</span>
          <input className="a-inp" value={t.title} onChange={(e) => patch(t.k, { title: e.target.value })} aria-label={`Track ${i + 1} title`} />
          <input className="a-inp a-mono" value={t.duration} onChange={(e) => patch(t.k, { duration: e.target.value })} placeholder="–:––" aria-label={`Track ${i + 1} duration`} inputMode="numeric" />
          <span className="a-trk-act" style={{ display: "flex", gap: 4 }}>
            <button type="button" className="a-ibtn" onClick={() => patch(t.k, { title_track: !t.title_track })} aria-pressed={t.title_track} aria-label={`Track ${i + 1} is the title track`} title="Title track" style={t.title_track ? { background: "var(--acc-soft)", color: "var(--acc-ink)" } : undefined}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={t.title_track ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
            </button>
            <button type="button" className="a-ibtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move track ${i + 1} up`}><Ico d="M6 15l6-6 6 6" /></button>
            <button type="button" className="a-ibtn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move track ${i + 1} down`}><Ico d="M6 9l6 6 6-6" /></button>
            <button type="button" className="a-ibtn" onClick={() => setRows((r) => r.filter((x) => x.k !== t.k))} aria-label={`Remove track ${i + 1}`}><Ico d="M6 6l12 12M18 6L6 18" /></button>
          </span>
        </div>
      ))}
      <div>
        <button type="button" className="a-btn" onClick={() => setRows((r) => [...r, { k: seq.current++, title: "", duration: "", title_track: false }])}>
          Add track
        </button>
      </div>
    </div>
  );
}
