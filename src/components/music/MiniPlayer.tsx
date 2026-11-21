"use client";

import type { MusicTrack } from "@/lib/db/music";
import { spotifyEmbedUrl } from "./embed";
import { PauseIcon, PlayIcon } from "./icons";
import s from "./music.module.css";

export interface PlayerProps {
  track: MusicTrack;
  /** Next tracks in queue order, with their index in the full queue. */
  upNext: { track: MusicTrack; index: number }[];
  playing: boolean;
  shuffle: boolean;
  /** False when the dock hosts the embed instead (keeps a single iframe mounted). */
  showEmbed: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onPick: (index: number) => void;
}

/** Playback always happens inside the official Spotify embed; the buttons here only drive which track is loaded. */
function EmbedSlot({ track, playing }: { track: MusicTrack; playing: boolean }) {
  const src = playing ? spotifyEmbedUrl(track.spotify_url) : null;
  if (src) {
    return <iframe className={s.embed} src={src} title={`${track.title} on Spotify`} allow="encrypted-media" loading="lazy" />;
  }
  return (
    <div className={s.embedNote}>
      {playing ? "Official Spotify link coming soon" : "Press play to load the Spotify player"}
    </div>
  );
}

const ctl = { background: "transparent", border: 0, color: "#fff" } as const;

export function MiniPlayer({ track, upNext, playing, shuffle, showEmbed, onToggle, onPrev, onNext, onShuffle, onPick }: PlayerProps) {
  return (
    <aside className={s.aside} aria-label="Player">
      <div style={{ minHeight: 520, borderRadius: 24, overflow: "hidden", position: "relative", color: "#fff", background: "#2B2440", boxShadow: "var(--shadow)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: -60, background: track.grad, filter: "blur(40px) saturate(1.2)", opacity: 0.9 }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(43,36,64,.1), rgba(43,36,64,.75))" }} />
        <div style={{ position: "relative", boxSizing: "border-box", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className={`${s.vinyl} ${playing ? s.vinylOn : ""}`} style={{ width: 220, height: 220, borderRadius: "50%", background: track.grad, boxShadow: "0 20px 40px rgba(0,0,0,.25), inset 0 0 0 4px rgba(255,255,255,.4)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 24, borderRadius: "50%", border: "1px solid rgba(43,36,64,.12)" }} />
              <div style={{ position: "absolute", left: "50%", top: "50%", width: 22, height: 22, margin: "-11px 0 0 -11px", borderRadius: "50%", background: "#2B2440", boxShadow: "0 0 0 6px rgba(255,255,255,.7)" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="disp" style={{ fontSize: 24, fontWeight: 600 }}>{track.title}</span>
            <span style={{ fontSize: 14, opacity: 0.85 }}>Hearts2Hearts · {track.album}</span>
          </div>
          {showEmbed && <EmbedSlot track={track} playing={playing} />}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="ibtn" onClick={onShuffle} aria-label="Shuffle" aria-pressed={shuffle} style={{ ...ctl, color: shuffle ? "#FFB6D5" : "#fff" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h4v4M4 20L20 4M20 16v4h-4M15 15l5 5M4 4l5 5" /></svg>
            </button>
            <button className="ibtn" onClick={onPrev} aria-label="Previous track" style={ctl}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6.5v11a1 1 0 0 1-1.55.83L8.5 13v4a1 1 0 0 1-2 0V7a1 1 0 0 1 2 0v4l7.95-5.33A1 1 0 0 1 18 6.5z" fill="currentColor" /></svg>
            </button>
            <button className="ibtn" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} style={{ width: 64, height: 64, background: "#fff", color: "#2B2440", border: 0, boxShadow: "var(--glow)" }}>
              {playing ? <PauseIcon /> : <PlayIcon size={24} />}
            </button>
            <button className="ibtn" onClick={onNext} aria-label="Next track" style={ctl}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5v11a1 1 0 0 0 1.55.83L15.5 13v4a1 1 0 0 0 2 0V7a1 1 0 0 0-2 0v4L7.55 5.67A1 1 0 0 0 6 6.5z" fill="currentColor" /></svg>
            </button>
          </div>
        </div>
      </div>
      <div className="glass" style={{ borderRadius: 20, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="lbl" style={{ letterSpacing: ".1em", fontSize: 12 }}>Credits · {track.title}</span>
        <span style={{ fontSize: 14, display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-500)" }}>Lyricist</span><span>—</span></span>
        <span style={{ fontSize: 14, display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-500)" }}>Composer</span><span>—</span></span>
      </div>
      {upNext.length > 0 && (
        <div className="glass" style={{ borderRadius: 20, padding: 10 }}>
          <span className="lbl" style={{ display: "block", padding: "6px 10px 8px", letterSpacing: ".1em", fontSize: 12 }}>Up next</span>
          {upNext.map(({ track: q, index }) => (
            <button key={index} className={s.qrow} onClick={() => onPick(index)}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: q.grad, display: "block", flex: "none" }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{q.title}</span>
              <span className={s.note} style={{ fontWeight: 400 }}>{q.album}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

/** Mobile dock (<= 1000px). Hosts the embed itself because the sidebar player is hidden there. */
export function MiniDock({ track, playing, showEmbed, onToggle }: Pick<PlayerProps, "track" | "playing" | "onToggle"> & { showEmbed: boolean }) {
  return (
    <div className={s.dockWrap} role="region" aria-label="Player">
      {showEmbed && playing && spotifyEmbedUrl(track.spotify_url) && (
        <div className="glass" style={{ borderRadius: 20, padding: 8 }}>
          <EmbedSlot track={track} playing={playing} />
        </div>
      )}
      <div className={`glass ${s.dockPill}`}>
        <span className={`${s.vinyl} ${playing ? s.vinylOn : ""}`} style={{ width: 48, height: 48, borderRadius: "50%", background: track.grad, display: "block", flex: "none" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</span>
          <span style={{ fontSize: 12, color: "#6E6787" }}>{track.album}</span>
        </span>
        <button className="ibtn" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} style={{ background: "var(--holo-deep)", color: "#fff", border: 0 }}>
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </button>
      </div>
    </div>
  );
}
