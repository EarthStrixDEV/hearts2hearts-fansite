"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { rankTitle, type Rarity } from "./rules";
import { usePrefersReducedMotion } from "./local-board";

export interface Reward { name: string; rarity: Rarity; grad: string; foil: number }
export type SaveState =
  | { status: "guest" }
  | { status: "saving" }
  | { status: "saved"; rank: number }
  | { status: "error"; message: string };

export function ResultView({
  game, raw, max, line, reward, save, onAgain, onShare,
}: {
  game: string; raw: number; max: number; line: string; reward: Reward | null; save: SaveState; onAgain: () => void; onShare: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) return setShown(raw);
    if (shown >= raw) return;
    const t = setTimeout(() => setShown((s) => s + 1), 140);
    return () => clearTimeout(t);
  }, [shown, raw, reduced]);

  const pct = max ? raw / max : 0;
  const saveLine =
    save.status === "saving" ? "Saving your score…"
    : save.status === "saved" ? `Posted to the online board · rank #${save.rank}`
    : save.status === "error" ? save.message
    : "Saved on this device. Sign in to post it online.";

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-7">
      <div className="glass gm-rise flex max-w-[460px] flex-[1_1_300px] flex-col items-center gap-3.5 rounded-card px-7 py-9 text-center">
        <span className="sr-only">{game} result</span>
        <span className="disp text-[34px] font-bold leading-[1.15] [text-wrap:balance]">{rankTitle(pct)}</span>
        <span className="disp text-[72px] font-bold leading-none tabular-nums" aria-label={`${raw} out of ${max}`}>
          {shown}
          <span className="text-[30px] text-ink-500">/{max}</span>
        </span>
        <span className="text-[15px] text-ink-500">{line}</span>
        <span role="status" className="text-[13px] text-ink-500">{saveLine}</span>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-s" onClick={onAgain}>Play again</button>
          <button type="button" className="btn btn-p" onClick={onShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
            </svg>
            Share
          </button>
        </div>
      </div>
      {reward && <figure className="gm-rise m-0 flex flex-col items-center gap-2.5" style={{ animationDelay: "200ms" }}>
        <div
          className="relative aspect-[3/4] w-[220px] overflow-hidden rounded-[20px] border-[6px] border-white"
          style={{ background: reward.grad, boxShadow: "0 24px 48px rgba(43,36,64,.2), var(--glow)" }}
        >
          <span className="absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 25%, rgba(255,182,213,.85) 40%, rgba(201,182,255,.85) 50%, rgba(168,216,255,.85) 60%, transparent 75%)", mixBlendMode: "color-dodge", opacity: reward.foil }} />
          <Chip className="absolute right-2.5 top-2.5" bg="#2B2440" color="#fff">{reward.rarity}</Chip>
          <span className="sig absolute bottom-2.5 left-3.5 text-[38px] text-[#2B2440]">{reward.name}</span>
        </div>
        <figcaption className="text-[13px] text-ink-500">New photocard collected · {reward.rarity}</figcaption>
      </figure>}
    </div>
  );
}
