"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { usePrefersReducedMotion } from "@/components/game/local-board";
import type { CityHouse, CitySpotView } from "@/lib/db/seed/city";
import type { CityView } from "./CityScene";

const CityScene = dynamic(() => import("./CityScene"), { ssr: false });

const STARS = Array.from({ length: 24 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 23) % 45, r: 1 + (i % 3), d: -(i % 5) * 0.4 }));
const HEART = "M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z";

export function CityExperience({ spots, houses }: { spots: CitySpotView[]; houses: CityHouse[] }) {
  const reduced = usePrefersReducedMotion();
  const [isNight, setNight] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<CityView>({ spotId: null, zoomMul: 1, resetKey: 0 });
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false); // loader unmounted after its fade-out
  const sel = spots.find((s) => s.id === view.spotId) ?? null;

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), reduced ? 0 : 450);
    return () => clearTimeout(t);
  }, [ready, reduced]);

  const pick = (id: string) => setView((v) => ({ ...v, spotId: id, zoomMul: 1.4 }));
  const reset = () => setView((v) => ({ spotId: null, zoomMul: 1, resetKey: v.resetKey + 1 }));

  return (
    <div
      className="ct-root"
      style={{ background: isNight ? "linear-gradient(180deg,#1B1630,#3B3068 60%,#6B5A9E)" : "linear-gradient(180deg,#CFE8FF,#FFF1F7 70%,#FFE3F1)" }}
    >
      {isNight && (
        <div aria-hidden="true" className="absolute inset-0">
          {STARS.map((s, i) => (
            <span key={i} className="twinkle absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, animationDelay: `${s.d}s` }} />
          ))}
        </div>
      )}

      <div className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label="Interactive 3D mini city. Use the Fly to list to visit each building.">
        <CityScene spots={spots} houses={houses} view={view} hover={hover} isNight={isNight} reduced={reduced} onHover={setHover} onPick={pick} onReady={() => setReady(true)} />
      </div>

      {/* top left */}
      <div className="absolute left-5 top-5 flex items-center gap-3">
        <Link href="/" aria-label="Back to home" className="ibtn glass fx">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <div className="glass flex flex-col rounded-tile px-4 py-2">
          <h1 className="disp m-0 text-[22px] font-semibold leading-tight">Heart Town</h1>
          <span className="text-xs text-[#5F5878]">Hearts2Hearts mini city</span>
        </div>
      </div>

      {/* top right */}
      <div className="absolute right-5 top-5 flex gap-2">
        <IconButton label="Night mode" aria-pressed={isNight} className="glass" onClick={() => setNight((n) => !n)}>
          {isNight ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
          )}
        </IconButton>
        <IconButton label="Reset view" className="glass" onClick={reset}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
        </IconButton>
      </div>

      {/* legend */}
      <nav className="ct-legend glass rounded-[20px] p-3" aria-label="Buildings">
        <span className="ct-lt lbl block px-3 pb-2 pt-1 text-xs tracking-[.1em] text-[#5F5878]">Fly to</span>
        <div className="ct-items flex flex-col gap-0.5">
          {spots.length === 0 && <span className="px-3 py-2 text-sm text-[#5F5878]">Nothing built here yet.</span>}
          {spots.map((s) => (
            <button
              key={s.id}
              type="button"
              className={view.spotId === s.id ? "ct-leg on" : "ct-leg"}
              aria-pressed={view.spotId === s.id}
              onClick={() => pick(s.id)}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.id)}
              onBlur={() => setHover(null)}
            >
              <span className="block h-2.5 w-2.5 flex-none rounded-full" style={{ background: s.dot }} />
              {s.name}
            </button>
          ))}
        </div>
      </nav>

      {/* info card */}
      {sel && (
        <div role="dialog" aria-label={sel.name} className="ct-info glass flex flex-col gap-2.5 rounded-[20px] p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="block h-3 w-3 rounded-full" style={{ background: sel.dot }} />
              <span className="disp text-[22px] font-semibold">{sel.name}</span>
            </span>
            <IconButton label="Close" onClick={() => setView((v) => ({ ...v, spotId: null, zoomMul: 1 }))} style={{ width: 36, height: 36, background: "rgba(43,36,64,.07)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </IconButton>
          </div>
          <span className="text-sm leading-[1.6] text-[#5F5878]">{sel.description}</span>
          <Button href={sel.href} className="min-h-11 self-start px-[18px] text-[15px]">
            Go to page
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Button>
        </div>
      )}

      {/* hint */}
      <div className="ct-hint glass absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-[18px] py-2.5 text-sm font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11V5a2 2 0 0 1 4 0v5M13 10V8a2 2 0 0 1 4 0v4M17 11a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L5 15a2 2 0 0 1 3.4-2L9 14" /></svg>
        Drag to explore · Click a building
      </div>

      {/* loading */}
      {!gone && (
        <div role="status" aria-live="polite" className="ct-loader" style={{ opacity: ready ? 0 : 1 }}>
          <svg width="120" height="120" viewBox="0 0 24 24" aria-hidden="true">
            <defs><clipPath id="ct-hc"><path d={HEART} /></clipPath></defs>
            <path d={HEART} fill="#FFE3F1" />
            <g clipPath="url(#ct-hc)"><g className="ct-wave"><path d="M-2 10 Q 4 8 10 10 T 22 10 T 34 10 T 46 10 V 30 H -2 Z" fill="#FF8FB8" /></g></g>
          </svg>
          <span className="text-sm text-ink-500">Building Heart Town…</span>
        </div>
      )}
    </div>
  );
}
