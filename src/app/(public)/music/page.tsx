import type { Metadata } from "next";
import { MusicBoard } from "@/components/music/MusicBoard";
import s from "@/components/music/music.module.css";
import { getMusicBoard } from "@/lib/db/music";

export const metadata: Metadata = {
  title: "Music",
  description: "Every Hearts2Hearts release, every era. Playback goes through official Spotify and YouTube embeds.",
};

export default async function MusicPage() {
  const data = await getMusicBoard();
  const latest = data.releases[0];

  return (
    <div className={s.page}>
      {latest && (
        <div aria-hidden="true" className={s.wash}>
          <div style={{ position: "absolute", inset: -80, background: latest.grad, filter: "blur(80px)", opacity: 0.55 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent, var(--cream-50))" }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "48px 24px 0", boxSizing: "border-box" }}>
        <h1 className="disp holo-text" style={{ margin: 0, fontSize: "clamp(44px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Music</h1>
        <p style={{ margin: "8px 0 0", fontSize: 17, color: "var(--ink-500)" }}>
          Every release, every era. Playback always goes through official Spotify and YouTube embeds.
        </p>
      </div>
      <MusicBoard data={data} />
    </div>
  );
}
