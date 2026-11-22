"use client";

import { useEffect, useState } from "react";
import type { HomeSlide } from "@/lib/db/home";
import { cn } from "@/lib/utils";
import styles from "./home.module.css";

const ARROW = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

/** Full-width era carousel. Auto-advances every 4.5s, pauses on hover/focus and under reduced motion. */
export function EraCarousel({ slides }: { slides: HomeSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const go = (k: number) => setI(((k % n) + n) % n);

  useEffect(() => {
    if (paused || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((k) => (k + 1) % n), 4500);
    return () => clearInterval(t);
  }, [paused, n]);

  const active = slides[i];
  return (
    <>
      <div className="mx-auto mb-6 flex max-w-[1200px] flex-wrap items-end justify-between gap-4 px-6">
        <div>
          <p className="m-0 mb-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-pink-700">Concepts</p>
          <h2 className="disp m-0 text-[44px] font-semibold tracking-[-0.02em]">Every era, in order</h2>
        </div>
        <p className="m-0 text-[15px] text-ink-500">{i + 1} / {n} · pauses on hover</p>
      </div>
      <div
        className={cn(styles.car, "relative w-full overflow-hidden aspect-[4/5] sm:aspect-[5/2] max-h-[760px]")}
        style={{ background: "#EEE6FF" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {slides.map((s, k) => (
          <div key={s.id} className={styles.slide} aria-hidden={k !== i} style={{ position: "absolute", inset: 0, opacity: k === i ? 1 : 0, overflow: "hidden" }}>
            <div className={k === i ? styles.kb : undefined} style={{ position: "absolute", inset: 0, background: s.imageUrl ? `center top / cover url(${s.imageUrl})` : s.grad }} />
            <div className="grain absolute inset-0" style={{ opacity: 0.7 }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="disp text-center font-bold leading-none tracking-[-0.03em]" style={{ fontSize: "clamp(64px, 12vw, 180px)", color: "rgba(255,255,255,.55)" }}>{s.name}</span>
            </div>
            {!s.imageUrl && <span className="chip absolute right-6 top-6" style={{ background: "rgba(255,255,255,.85)", color: "#2B2440" }}>TODO · official concept photo</span>}
          </div>
        ))}
        <div className="glass absolute bottom-7 flex flex-col gap-0.5 rounded-2xl px-[18px] py-3" style={{ left: "max(24px, calc(50% - 576px))" }}>
          <span className="disp text-[22px] font-semibold">{active.name}</span>
          <span className="text-[13px] text-ink-500">{active.subline}</span>
        </div>
        <button type="button" className={cn("ibtn absolute left-6 top-1/2 -mt-[22px]", styles.carArrow)} aria-label="Previous slide" onClick={() => go(i - 1)}>{ARROW("M15 5l-7 7 7 7")}</button>
        <button type="button" className={cn("ibtn absolute right-6 top-1/2 -mt-[22px]", styles.carArrow)} aria-label="Next slide" onClick={() => go(i + 1)}>{ARROW("M9 5l7 7-7 7")}</button>
      </div>
      <div className="mt-2 flex justify-center gap-0.5">
        {slides.map((s, k) => (
          <button key={s.id} type="button" className={cn("fx", styles.dotHit)} aria-label={`Go to ${s.name}`} aria-current={k === i} onClick={() => go(k)}>
            <span className={cn(styles.dot, k === i && styles.on)} />
          </button>
        ))}
      </div>
    </>
  );
}
