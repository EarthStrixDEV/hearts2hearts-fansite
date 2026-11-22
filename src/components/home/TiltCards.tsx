"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Photo } from "@/components/ui/Photo";
import type { MemberCardData, Rarity } from "@/components/members/profile";
import { cn } from "@/lib/utils";
import { Star } from "./Star";
import styles from "./home.module.css";

const RARITY: Record<Rarity, { label: string; bg: string; fg: string }> = {
  holo: { label: "Holo", bg: "#2B2440", fg: "#FFFFFF" },
  rare: { label: "Rare", bg: "#FFFFFF", fg: "#8A3FC9" },
  common: { label: "Common", bg: "rgba(255,255,255,.85)", fg: "#2B2440" },
};
const HEART = "M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z";
const face = { position: "absolute", inset: 0, borderRadius: 24, overflow: "hidden", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", border: "5px solid #fff", boxSizing: "border-box" } as const;

type Tilt = { px: number; py: number };
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Member photocards: pointer-tilt with a holo sheen, click/Enter flips to quick facts. Sideways scroll under 860px. */
export function TiltCards({ cards }: { cards: MemberCardData[] }) {
  const [tilt, setTilt] = useState<Record<string, Tilt | null>>({});
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const lock = useRef<Record<string, number>>({});

  const move = (slug: string, e: MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion() || Date.now() < (lock.current[slug] ?? 0)) return;
    const b = e.currentTarget.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
    const py = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
    setTilt((t) => ({ ...t, [slug]: { px, py } }));
  };
  const flip = (slug: string) => {
    lock.current[slug] = Date.now() + 700;
    setFlipped((f) => ({ ...f, [slug]: !f[slug] }));
    setTilt((t) => ({ ...t, [slug]: null }));
  };

  return (
    <div className={styles.pcRow}>
      {cards.map((c) => {
        const t = tilt[c.slug];
        const f = !!flipped[c.slug];
        const rx = t ? (0.5 - t.py) * 30 : 0;
        const ry = t ? (t.px - 0.5) * 30 : 0;
        const hx = ((t ? t.px : 0.5) * 100).toFixed(1);
        const hy = ((t ? t.py : 0.3) * 100).toFixed(1);
        const ho = (t ? 0.35 + Math.hypot(t.px - 0.5, t.py - 0.5) * 1.1 : c.rarity === "holo" ? 0.45 : 0.2).toFixed(2);
        const r = RARITY[c.rarity];
        return (
          <button
            key={c.slug}
            type="button"
            className={cn("fx", styles.pc)}
            style={{ borderRadius: 24 }}
            aria-label={`Photocard of ${c.name}${f ? ", back side. Click to flip" : ". Click to flip for quick facts"}`}
            onMouseMove={(e) => move(c.slug, e)}
            onMouseLeave={() => setTilt((s) => ({ ...s, [c.slug]: null }))}
            onClick={() => flip(c.slug)}
          >
            <span className={styles.autotilt} style={{ display: "block", transformStyle: "preserve-3d" }}>
              <span style={{ display: "block", position: "relative", aspectRatio: "3 / 4", transformStyle: "preserve-3d", transform: `rotateX(${rx.toFixed(2)}deg) rotateY(${(ry + (f ? 180 : 0)).toFixed(2)}deg)`, transition: t ? "transform 120ms ease-out" : "transform 650ms cubic-bezier(.34,1.56,.64,1)" }}>
                <span style={{ ...face, background: `linear-gradient(160deg,${c.color}, #FFF8F3 120%)`, boxShadow: "0 16px 32px rgba(43,36,64,.14)", display: "block" }}>
                  {c.photo && <Photo src={c.photo} />}
                  <span style={{ position: "absolute", inset: 0, display: "block", background: "linear-gradient(115deg, transparent 20%, rgba(255,182,213,.9) 36%, rgba(201,182,255,.9) 46%, rgba(168,216,255,.9) 56%, rgba(255,227,241,.9) 64%, transparent 78%)", backgroundSize: "260% 260%", backgroundPosition: `${hx}% ${hy}%`, mixBlendMode: "color-dodge", opacity: ho }} />
                  <span aria-hidden="true" style={{ position: "absolute", left: `${hx}%`, top: `${hy}%`, width: 160, height: 160, margin: "-80px 0 0 -80px", display: "block", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.55), rgba(255,255,255,0) 65%)", opacity: ho }} />
                  <Star className="twinkle absolute" size={18} fill="#fff" style={{ right: "22%", top: "30%" }} />
                  <span className="chip" style={{ position: "absolute", top: 12, right: 12, background: r.bg, color: r.fg }}>{r.label}</span>
                  {!c.photo && <span className="chip" style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,.85)", color: "#2B2440" }}>TODO · photo</span>}
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "40px 16px 14px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: "linear-gradient(0deg, rgba(43,36,64,.62), rgba(43,36,64,0))" }}>
                    <span className="disp" style={{ fontSize: 26, fontWeight: 600, color: "#fff" }}>{c.name}</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,.92)" }}>{c.ko}</span>
                  </span>
                </span>
                <span style={{ ...face, transform: "rotateY(180deg)", background: c.color, padding: "22px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#2B2440", boxShadow: "0 16px 32px rgba(43,36,64,.14)" }}>
                  <span className="sig" style={{ fontSize: 52, lineHeight: 1, display: "block", transform: "rotate(-6deg)" }}>{c.name}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.45 }}>
                    {[`Born ${c.bornLabel}`, c.nationality, c.fact].filter(Boolean).map((q) => (
                      <span key={q} style={{ display: "flex", gap: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none", marginTop: 4 }}><path d={HEART} fill="#2B2440" /></svg>
                        <span>{q}</span>
                      </span>
                    ))}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.75 }}>Hearts2Hearts · {c.firstPosition}</span>
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
