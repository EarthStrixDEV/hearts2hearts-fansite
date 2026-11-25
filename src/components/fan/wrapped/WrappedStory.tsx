"use client";

import { useState } from "react";
import { bigFontSize, type WrappedSlide } from "@/lib/fan/wrapped";
import { cn } from "@/lib/utils";
import s from "./wrapped.module.css";

export interface WrappedStoryProps {
  year: number;
  nickname: string;
  slides: WrappedSlide[];
  fandom: { fans: number; actions: number };
  /** text for the "Post to X" intent */
  tweet: string;
}

const Chevron = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
);

/** Story slides with prev / next, progress bars, a thumbnail strip and the share buttons. State is only the slide index. */
export function WrappedStory({ year, nickname, slides, fandom, tweet }: WrappedStoryProps) {
  const [i, setI] = useState(0);
  const [status, setStatus] = useState("");
  const n = slides.length;
  const slide = slides[i];
  // The hub is the public page; a Wrapped is private to its owner, so that is what a shared link points at.
  const shareUrl = () => `${window.location.origin}/fan`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setStatus("Link copied.");
    } catch {
      setStatus("Could not copy. Copy the address of the S2U hub from your browser instead.");
    }
  };
  const postToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={s.layout}>
      <div className={s.stage}>
        <div key={slide.id} className={s.slide} style={{ background: slide.bg, color: slide.ink }} role="group" aria-roledescription="slide" aria-label={`${slide.kicker}: ${slide.big}`}>
          <div className={s.bars} aria-hidden="true">
            {slides.map((x, k) => (
              <span key={x.id} className={s.bar} style={{ background: k <= i ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.4)" }} />
            ))}
          </div>
          <div className={s.copy}>
            <span className={cn("lbl", s.kicker)} style={{ color: slide.ink }}>{slide.kicker}</span>
            <span className={cn("disp", s.big)} style={{ fontSize: bigFontSize(slide.big) }}>{slide.big}</span>
            <span className={cn("disp", s.line)}>{slide.line}</span>
            <span className={s.subtext}>{slide.sub}</span>
          </div>
          <div className={s.foot}>
            <span className={cn("sig", s.sigName)}>S2U · {nickname}</span>
            <span className={cn("disp", s.brand)}>H2H·S2U</span>
          </div>
        </div>
        <div className={s.nav}>
          <button type="button" className="ibtn" aria-label="Previous card" onClick={() => setI((i + n - 1) % n)}><Chevron d="M15 5l-7 7 7 7" /></button>
          <span className={s.pos} aria-live="polite">{i + 1} / {n}</span>
          <button type="button" className="ibtn" aria-label="Next card" onClick={() => setI((i + 1) % n)}><Chevron d="M9 5l7 7-7 7" /></button>
        </div>
      </div>

      <div className={s.side}>
        <section className={s.card} aria-label="All cards">
          <span className="lbl">All cards</span>
          <div className={s.thumbs}>
            {slides.map((x, k) => (
              <button
                key={x.id}
                type="button"
                className={cn(s.thumb, k === i && s.thumbOn)}
                style={{ background: x.bg }}
                aria-label={x.kicker}
                aria-current={k === i ? "true" : undefined}
                onClick={() => setI(k)}
              >
                <span className={cn("disp", s.thumbBig)} style={{ color: x.ink }}>{x.big}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={s.card} aria-label="Share">
          <span className="lbl">Share</span>
          <div className={s.shareRow}>
            <a className="btn btn-p" href={`/fan/wrapped/${year}/image/${i}?download=1`} download>Save as story image</a>
            <button type="button" className="btn btn-s" onClick={copyLink}>Copy link</button>
            <button type="button" className="btn btn-s" onClick={postToX}>Post to X</button>
          </div>
          <span className={s.status} role="status">{status}</span>
          <span className={s.note}>Images are 1080×1920. Rank cards show a percentile, never other fans’ names.</span>
        </section>

        <section className={cn(s.card, s.fandom)} aria-label="The whole fandom">
          <span className={cn("lbl", s.fandomLbl)}>The whole fandom</span>
          <span className={cn("disp", s.fandomTitle)}>
            S2U together: {fandom.actions.toLocaleString("en-US")} {fandom.actions === 1 ? "action" : "actions"} from {fandom.fans.toLocaleString("en-US")} {fandom.fans === 1 ? "fan" : "fans"} in {year}
          </span>
          <span className={s.fandomText}>Logins, missions and live rooms added up. Streams are not tracked on this site yet.</span>
        </section>
      </div>
    </div>
  );
}
