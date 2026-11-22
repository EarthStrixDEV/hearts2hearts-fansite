"use client";

import { useEffect, useRef, useState } from "react";
import s from "./music.module.css";

/* Minimal slice of the YouTube IFrame Player API that we use. */
interface YtPlayer {
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  playVideoAt(i: number): void;
  loadPlaylist(o: { listType: "playlist"; list: string; index: number }): void;
  getPlaylistIndex(): number;
  getPlaylist(): string[] | null;
  getIframe(): HTMLIFrameElement;
}
interface YtApi {
  Player: new (el: HTMLElement, o: Record<string, unknown>) => YtPlayer;
}
declare global {
  interface Window {
    YT?: YtApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

let apiReady: Promise<YtApi> | null = null;
/** Loads the official IFrame API script once. */
function loadApi(): Promise<YtApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return (apiReady ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const el = document.createElement("script");
    el.src = "https://www.youtube.com/iframe_api";
    el.async = true;
    document.head.append(el);
  }));
}

/**
 * Plays one track of a YouTube Music album (an OLAK… playlist) through the official YouTube player, privacy-enhanced host.
 * The board owns the state: `playlist` + `index` pick the track, `playing` says play/pause. The player reports back when
 * the viewer pauses inside it (onPlaying), when it moves to the next track on its own (onIndex) and when the album ends (onEnd).
 */
export function YtEmbed({
  playlist,
  index,
  playing,
  title,
  onPlaying,
  onIndex,
  onEnd,
}: {
  playlist: string;
  index: number;
  playing: boolean;
  title: string;
  onPlaying: (p: boolean) => void;
  onIndex: (i: number) => void;
  onEnd: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YtPlayer | null>(null);
  const loaded = useRef<{ list: string; index: number } | null>(null);
  const want = useRef({ playlist, index, playing });
  // Switching tracks makes the player emit a transient PAUSED; it must not be mistaken for the viewer pausing.
  const quietUntil = useRef(0);
  // The player refused this video (removed, region-locked, embedding off): say so instead of a black box.
  const [failed, setFailed] = useState(false);
  const cb = useRef({ onPlaying, onIndex, onEnd });
  want.current = { playlist, index, playing };
  cb.current = { onPlaying, onIndex, onEnd };

  // Create the player once.
  useEffect(() => {
    let dead = false;
    const mount = document.createElement("div");
    host.current?.append(mount);
    loadApi().then((YT) => {
      if (dead) return;
      const w = want.current;
      loaded.current = { list: w.playlist, index: w.index };
      player.current = new YT.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { listType: "playlist", list: w.playlist, index: w.index, autoplay: w.playing ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onError: () => setFailed(true),
          onStateChange: (e: { data: number }) => {
            const p = player.current;
            if (!p) return;
            if (e.data === PLAYING) {
              setFailed(false);
              cb.current.onPlaying(true);
              const i = p.getPlaylistIndex();
              if (i >= 0 && i !== loaded.current?.index) {
                loaded.current = { list: loaded.current?.list ?? want.current.playlist, index: i };
                cb.current.onIndex(i);
              }
            } else if (e.data === PAUSED) {
              if (Date.now() >= quietUntil.current) cb.current.onPlaying(false);
            }
            else if (e.data === ENDED) {
              const n = p.getPlaylist()?.length ?? 0;
              if (n > 0 && p.getPlaylistIndex() >= n - 1) cb.current.onEnd();
            }
          },
        },
      });
      player.current.getIframe().title = `${title} (YouTube Music)`;
    });
    return () => {
      dead = true;
      player.current?.destroy();
      player.current = null;
      mount.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Another track / album was picked.
  useEffect(() => {
    const p = player.current;
    const l = loaded.current;
    if (!p || !l) return;
    if (l.list !== playlist) {
      loaded.current = { list: playlist, index };
      quietUntil.current = Date.now() + 3000;
      setFailed(false);
      p.loadPlaylist({ listType: "playlist", list: playlist, index });
    } else if (l.index !== index) {
      loaded.current = { list: playlist, index };
      quietUntil.current = Date.now() + 3000;
      setFailed(false);
      p.playVideoAt(index);
    }
  }, [playlist, index]);

  // Keep the iframe's accessible name on the current track.
  useEffect(() => {
    const f = player.current?.getIframe();
    if (f) f.title = `${title} (YouTube Music)`;
  }, [title]);

  // Play / pause button.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (playing) p.playVideo();
    else p.pauseVideo();
  }, [playing]);

  return (
    <>
      <div ref={host} className={s.ytFrame} />
      {failed && <div className={s.embedNote}>This track can’t be played inside the page. Use “Open in YouTube Music” below.</div>}
    </>
  );
}
