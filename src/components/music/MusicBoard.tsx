"use client";

import { useState, useSyncExternalStore } from "react";
import { xImageSize } from "@/lib/media-url";
import type { MusicBoardData, MusicRelease } from "@/lib/db/music";
import { AlbumGrid } from "./AlbumGrid";
import { EraTimeline } from "./EraTimeline";
import { PlayIcon } from "./icons";
import { MiniDock, MiniPlayer } from "./MiniPlayer";
import { MvRail } from "./MvRail";
import { TrackList } from "./TrackList";
import s from "./music.module.css";

const MOBILE = "(max-width: 1000px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(MOBILE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** Only one of sidebar player / dock may mount the Spotify iframe. */
const useIsMobile = () => useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE).matches, () => false);

const longDate = (d: string | null) =>
  d && d.length === 10 ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : (d ?? "");

export function MusicBoard({ data }: { data: MusicBoardData }) {
  const { releases, tracks, videos, eras } = data;
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const mobile = useIsMobile();
  const latest = releases[0];
  const track = tracks[current];

  const play = (i: number) => {
    setCurrent(i);
    setStarted(true);
    setPlaying(true);
  };
  const toggle = () => {
    setStarted(true);
    setPlaying(!playing);
  };
  // The YouTube player moved to another track of the album on its own: follow it.
  const sync = (ytmIndex: number) => {
    const q = tracks.findIndex((t) => t.ytm === track?.ytm && t.ytmIndex === ytmIndex);
    if (q >= 0) setCurrent(q);
  };
  const playRelease = (r: MusicRelease) => {
    const base = r.title.replace(" (Japanese ver.)", "");
    const i = tracks.findIndex((t) => t.title === base || t.album === base);
    if (i >= 0) play(i);
  };
  const step = (d: number) => {
    let i = (current + d + tracks.length) % tracks.length;
    if (shuffle && tracks.length > 1) while (i === current) i = Math.floor(Math.random() * tracks.length);
    setCurrent(i);
  };
  const upNext = [1, 2, 3, 4]
    .filter((k) => k < tracks.length)
    .map((k) => ({ index: (current + k) % tracks.length, track: tracks[(current + k) % tracks.length] }));

  return (
    <>
      <div className={s.layout}>
        <div className={s.main}>
          {latest && (
            <section aria-label="Latest release" className={s.hero}>
              <div className={s.heroCover}>
                <div className={s.vinylOut} aria-hidden="true" />
                <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: latest.cover ? `center / cover no-repeat url("${xImageSize(latest.cover, "medium")}")` : latest.grad, boxShadow: "0 24px 48px rgba(201,42,104,.25)" }} />
              </div>
              <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="chip" style={{ alignSelf: "flex-start", background: "#2B2440", color: "#fff" }}>Latest · {latest.kind}</span>
                <span className="disp" style={{ fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{latest.title}</span>
                <span style={{ fontSize: 16, color: "var(--ink-500)" }}>{longDate(latest.release_date)}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 8 }}>
                  <a className="btn btn-p" href={latest.spotify_url ?? "https://open.spotify.com/search/Hearts2Hearts"} target="_blank" rel="noopener noreferrer">
                    <PlayIcon />Play on Spotify
                  </a>
                  {latest.ytmusic_url && <a className="btn btn-s" href={latest.ytmusic_url} target="_blank" rel="noopener noreferrer">Listen on YouTube Music</a>}
                  {tracks.length > 0 && <button className="btn btn-s" onClick={() => playRelease(latest)}>Add to queue</button>}
                </div>
              </div>
            </section>
          )}
          <AlbumGrid releases={releases} onPlay={playRelease} />
          {tracks.length > 0 && <TrackList tracks={tracks.slice(0, 6)} current={current} playing={playing} onPick={play} />}
          {videos.length > 0 && <MvRail videos={videos} />}
          {eras.length > 0 && <EraTimeline eras={eras} />}
        </div>
        {track && (
          <MiniPlayer
            track={track}
            upNext={upNext}
            playing={playing}
            started={started}
            shuffle={shuffle}
            showEmbed={!mobile}
            onToggle={toggle}
            onPlaying={setPlaying}
            onSync={sync}
            onEnd={() => step(1)}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onShuffle={() => setShuffle(!shuffle)}
            onPick={play}
          />
        )}
      </div>
      {track && <MiniDock track={track} playing={playing} started={started} showEmbed={mobile} onToggle={toggle} onPlaying={setPlaying} onSync={sync} onEnd={() => step(1)} />}
    </>
  );
}
