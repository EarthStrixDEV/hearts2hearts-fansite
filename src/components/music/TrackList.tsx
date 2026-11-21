"use client";

import type { MusicTrack } from "@/lib/db/music";
import { PlayIcon } from "./icons";
import s from "./music.module.css";

export function TrackList({
  tracks,
  current,
  playing,
  onPick,
}: {
  tracks: MusicTrack[];
  current: number;
  playing: boolean;
  onPick: (index: number) => void;
}) {
  return (
    <section aria-labelledby="pt">
      <div className={s.sectionHead} style={{ marginBottom: 12 }}>
        <h2 id="pt" className={`disp ${s.h2}`}>Popular tracks</h2>
      </div>
      <ul className={`glass ${s.tracks}`} aria-label="Popular tracks">
        <li aria-hidden="true" className={`${s.trow} ${s.trowHead}`}>
          <span style={{ textAlign: "center" }}>#</span>
          <span />
          <span>Title</span>
          <span className={s.alcol}>Album</span>
          <span style={{ textAlign: "right" }}>Time</span>
        </li>
        {tracks.map((t, i) => {
          const active = i === current;
          return (
            <li key={`${t.album}-${t.title}`}>
              <button className={`${s.trow} ${active ? s.trowOn : ""}`} onClick={() => onPick(i)} aria-label={`Play ${t.title}`} aria-current={active ? "true" : undefined}>
                <span style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", color: "var(--ink-500)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                  {active && playing ? (
                    <span className={s.eq} aria-hidden="true"><span /><span style={{ animationDelay: "-.3s" }} /><span style={{ animationDelay: "-.6s" }} /></span>
                  ) : (
                    <>
                      <span className={s.nm}>{i + 1}</span>
                      <span className={s.pi}><PlayIcon size={14} /></span>
                    </>
                  )}
                </span>
                <span style={{ width: 44, height: 44, borderRadius: 8, background: t.grad, display: "block" }} />
                <span style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                <span className={s.alcol}>{t.album}</span>
                <span style={{ fontSize: 13, color: "var(--ink-500)", textAlign: "right", fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>–:––</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
