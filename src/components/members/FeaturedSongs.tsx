"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./member-detail.module.css";

export interface SongRow { title: string; album: string; grad: string }

/** "Featured songs" list plus the docked "now playing" pill (a stand-in for the Spotify embed until the music module lands). */
export function FeaturedSongs({ songs }: { songs: SongRow[] }) {
  const [current, setCurrent] = useState<SongRow | null>(null);
  return (
    <>
      <div className="glass flex-[999_1_520px] rounded-card p-2.5">
        {songs.map((s) => (
          <button key={s.title} type="button" className={cn("fx", styles.srow, current?.title === s.title && styles.on)} aria-label={`Play ${s.title} in the music widget`} onClick={() => setCurrent(s)}>
            <span style={{ width: 44, height: 44, borderRadius: 10, background: s.grad, display: "block" }} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base">{s.title}</span>
              <span className="text-[13px] font-normal text-ink-500">{s.album} · part: TODO</span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-[#2B2440]" style={{ background: "var(--accent)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" /></svg>
            </span>
          </button>
        ))}
      </div>

      {current && (
        <div
          className={cn("glass", styles.docked)}
          style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", zIndex: 60, width: 340, maxWidth: "calc(100% - 32px)", height: 64, boxSizing: "border-box", borderRadius: 999, display: "flex", alignItems: "center", gap: 12, padding: "0 8px", boxShadow: "0 12px 32px rgba(43,36,64,.2)", background: "rgba(255,255,255,.88)", color: "#2B2440" }}
        >
          <span style={{ width: 48, height: 48, borderRadius: "50%", background: current.grad, display: "block", flex: "none" }} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span style={{ fontSize: 11, color: "#6E6787" }}>Now playing · via Spotify</span>
            <span className="truncate text-[15px] font-semibold">{current.title}</span>
          </span>
          <button type="button" className="ibtn" aria-label="Close player" style={{ background: "transparent", border: 0, color: "#2B2440" }} onClick={() => setCurrent(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
