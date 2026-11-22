"use client";

import { useEffect, useState } from "react";
import { coverBg } from "@/lib/media-url";
import type { HomeTrack } from "@/lib/db/home";
import { YtEmbed } from "@/components/music/YtEmbed";
import { cn } from "@/lib/utils";
import styles from "./home.module.css";

/** Dispatched on `window` by the hero's "Listen Now" button. */
export const PLAY_EVENT = "h2h:play";

const PLAY_PATH = "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z";
const PLAY = (size: number) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={PLAY_PATH} fill="currentColor" /></svg>;
const PAUSE = (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
  </svg>
);

/** Home "Top 5" player card + track list. Sound comes from the official YouTube Music player (in-page) once play is pressed. */
export function MusicWidget({ tracks }: { tracks: HomeTrack[] }) {
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const n = tracks.length;
  const cur = tracks[track];

  useEffect(() => {
    const start = () => {
      setStarted(true);
      setPlaying(true);
    };
    window.addEventListener(PLAY_EVENT, start);
    return () => window.removeEventListener(PLAY_EVENT, start);
  }, []);

  const vinyl = cn(styles.vinyl, playing && styles.on);
  return (
    <div className="flex flex-wrap items-stretch gap-6">
      <div className="relative min-h-[300px] max-w-[420px] flex-[1_1_320px] overflow-hidden rounded-card text-white" style={{ background: "#2B2440" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: -60, background: coverBg(cur.cover, cur.grad), filter: "blur(40px) saturate(1.2)", opacity: 0.9 }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(43,36,64,.1), rgba(43,36,64,.75))" }} />
        <div className="relative box-border flex h-full flex-col justify-between gap-5 p-6">
          <div className="flex items-center gap-[18px]">
            <div className={vinyl} style={{ width: 120, height: 120, flex: "none", borderRadius: "50%", background: coverBg(cur.cover, cur.grad), boxShadow: "0 16px 32px rgba(0,0,0,.25), inset 0 0 0 4px rgba(255,255,255,.4)", position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: "50%", width: 16, height: 16, margin: "-8px 0 0 -8px", borderRadius: "50%", background: "#2B2440", boxShadow: "0 0 0 5px rgba(255,255,255,.7)" }} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="disp text-[26px] font-semibold">{cur.title}</span>
              <span className="text-sm opacity-85">{cur.album}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" className="ibtn" aria-label="Previous track" style={{ background: "transparent", border: 0, color: "#fff" }} onClick={() => setTrack((track + n - 1) % n)}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6.5v11a1 1 0 0 1-1.55.83L8.5 13v4a1 1 0 0 1-2 0V7a1 1 0 0 1 2 0v4l7.95-5.33A1 1 0 0 1 18 6.5z" fill="currentColor" /></svg>
            </button>
            <button type="button" className="ibtn" aria-label={playing ? "Pause" : "Play"} style={{ width: 64, height: 64, background: "#fff", color: "#2B2440", border: 0, boxShadow: "var(--glow)" }} onClick={() => { setStarted(true); setPlaying(!playing); }}>
              {playing ? PAUSE(24) : PLAY(24)}
            </button>
            <button type="button" className="ibtn" aria-label="Next track" style={{ background: "transparent", border: 0, color: "#fff" }} onClick={() => setTrack((track + 1) % n)}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5v11a1 1 0 0 0 1.55.83L15.5 13v4a1 1 0 0 0 2 0V7a1 1 0 0 0-2 0v4L7.55 5.67A1 1 0 0 0 6 6.5z" fill="currentColor" /></svg>
            </button>
          </div>
          {started && cur.ytm && (
            <YtEmbed
              playlist={cur.ytm}
              index={cur.ytmIndex ?? 0}
              playing={playing}
              title={cur.title}
              onPlaying={setPlaying}
              onIndex={(i) => {
                const q = tracks.findIndex((t) => t.ytm === cur.ytm && t.ytmIndex === i);
                if (q >= 0) setTrack(q);
              }}
              onEnd={() => setTrack((track + 1) % n)}
            />
          )}
          <p className="m-0 text-center text-[11px] opacity-80">
            Plays through the official YouTube Music player ·{" "}
            <a href="https://open.spotify.com/search/Hearts2Hearts" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>Open in Spotify</a>
          </p>
        </div>
      </div>

      <div className="glass min-w-0 flex-[999_1_480px] rounded-card p-3">
        {tracks.map((t, k) => (
          <button key={t.title} type="button" className={cn("fx", styles.row, k === track && styles.on)} aria-label={`Play ${t.title}`} onClick={() => { setTrack(k); setStarted(true); setPlaying(true); }}>
            <span className="inline-flex items-center justify-center text-sm tabular-nums text-ink-500">
              {k === track ? (
                <span className={styles.eq} aria-hidden="true" style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 14 }}>
                  <span /><span style={{ animationDelay: "-.3s" }} /><span style={{ animationDelay: "-.6s" }} />
                </span>
              ) : (
                <>
                  <span className={styles.nm}>{k + 1}</span>
                  <span className={styles.pi}>{PLAY(14)}</span>
                </>
              )}
            </span>
            <span style={{ width: 44, height: 44, borderRadius: 8, background: coverBg(t.cover, t.grad), display: "block" }} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px]">{t.title}</span>
              <span className="text-[13px] font-normal text-ink-500">{t.album}</span>
            </span>
            <span className="text-[13px] font-normal tabular-nums text-ink-500">–:––</span>
          </button>
        ))}
        <p className="mx-3 mb-1 mt-2 text-xs text-ink-500">Order is a placeholder (title tracks first); it is not a chart ranking.</p>
      </div>
    </div>
  );
}
