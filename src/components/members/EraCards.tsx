"use client";

import { useState } from "react";
import styles from "./member-detail.module.css";

import { Photo } from "@/components/ui/Photo";

export interface EraCard { era: string; dateLabel: string; grad: string; /** official photo from that era, or null → gradient */ photo?: string | null }

/** One flip-card per era (MemberDetail "Photocard collection"). */
export function EraCards({ name, cards }: { name: string; cards: EraCard[] }) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  return (
    <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(170px, 100%), 1fr))" }}>
      {cards.map((c) => {
        const f = !!flipped[c.era];
        return (
          <button
            key={c.era}
            type="button"
            className={`fx ${styles.pcard}`}
            style={{ borderRadius: 18 }}
            aria-label={`${name} ${c.era} photocard, click to flip`}
            onClick={() => setFlipped((s) => ({ ...s, [c.era]: !s[c.era] }))}
          >
            <span style={{ display: "block", position: "relative", aspectRatio: "3 / 4", transformStyle: "preserve-3d", transition: "transform 650ms cubic-bezier(.34,1.56,.64,1)", transform: f ? "rotateY(180deg)" : "rotateY(0deg)" }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: 18, border: "4px solid #fff", boxSizing: "border-box", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: c.grad, boxShadow: "0 12px 24px rgba(43,36,64,.12)", overflow: "hidden", display: "block" }}>
                {c.photo && <Photo src={c.photo} />}
                {c.photo && <span style={{ position: "absolute", inset: "45% 0 0 0", background: "linear-gradient(to top, rgba(43,36,64,.78), transparent)", display: "block" }} />}
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, transparent 25%, rgba(255,255,255,.6) 45%, transparent 60%)", mixBlendMode: "soft-light", display: "block" }} />
                <span className="disp" style={{ position: "absolute", left: 12, right: 12, bottom: 10, fontSize: 16, fontWeight: 600, color: c.photo ? "#fff" : "#2B2440", textShadow: c.photo ? "0 1px 6px rgba(43,36,64,.5)" : undefined }}>{c.era}</span>
              </span>
              <span style={{ position: "absolute", inset: 0, borderRadius: 18, border: "4px solid #fff", boxSizing: "border-box", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "var(--accent)", padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#2B2440" }}>
                <span className="sig" style={{ fontSize: 34, transform: "rotate(-6deg)", display: "block" }}>{name}</span>
                <span style={{ fontSize: 12, lineHeight: 1.4, display: "flex", flexDirection: "column", gap: 2 }}>
                  <strong>{c.era}</strong>
                  <span>{c.dateLabel}</span>
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
