"use client";

import { useState } from "react";
import type { MusicVideo } from "@/lib/db/music";
import { youtubeEmbedUrl } from "./embed";
import { PlayIcon } from "./icons";
import s from "./music.module.css";

/** Thumbnail first; the YouTube iframe is only mounted after a click. */
export function MvRail({ videos }: { videos: MusicVideo[] }) {
  const [loaded, setLoaded] = useState<number | null>(null);

  return (
    <section aria-labelledby="mvh">
      <div className={s.sectionHead}>
        <h2 id="mvh" className={`disp ${s.h2}`}>Music videos</h2>
        <span className={s.note}>Thumbnail first; the YouTube embed loads on click</span>
      </div>
      <div className={s.hscroll}>
        {videos.map((v, i) => {
          const embed = loaded === i ? youtubeEmbedUrl(v.youtube_url) : null;
          const caption = (
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{v.title}</span>
              <span className={s.note}>{v.date}</span>
            </span>
          );
          if (embed) {
            return (
              <div key={v.title} className={s.mvFrame}>
                <span className={s.mvThumb} style={{ background: "#1b1630" }}>
                  <iframe
                    src={embed}
                    title={`${v.title} music video`}
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  />
                </span>
                {caption}
              </div>
            );
          }
          return (
            <button key={v.title} className={s.mv} onClick={() => setLoaded(i)} aria-label={`Play ${v.title} music video`}>
              <span className={s.mvThumb} style={{ background: v.grad }}>
                {loaded === i ? (
                  <span style={{ position: "absolute", inset: 0, background: "#1b1630", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, textAlign: "center", padding: 20 }}>
                    Official music video link coming soon
                  </span>
                ) : (
                  <span style={{ position: "absolute", left: "50%", top: "50%", width: 68, height: 68, margin: "-34px 0 0 -34px", borderRadius: "50%", background: "rgba(255,255,255,.92)", color: "#2B2440", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(43,36,64,.2)" }}>
                    <PlayIcon size={26} />
                  </span>
                )}
              </span>
              {caption}
            </button>
          );
        })}
      </div>
    </section>
  );
}
