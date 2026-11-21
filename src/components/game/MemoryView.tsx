"use client";

import { useEffect, useRef, useState } from "react";
import { HeartIcon } from "@/components/ui/HeartIcon";
import type { CardPayload } from "@/lib/db/seed/game";

interface Card { id: number; name: string; color: string }

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Raw round score 1..8: 8 minus half a point per move over 8 (see docs/game-payload.md). */
export const memoryRaw = (moves: number, pairs: number) => Math.round(Math.max(1, pairs - Math.max(0, moves - pairs) / 2));

export function MemoryView({ cards, onFinish, onQuit }: { cards: CardPayload[]; onFinish: (raw: number, pairs: number) => void; onQuit: () => void }) {
  const [deck] = useState<Card[]>(() => shuffle(cards.concat(cards)).map((c, i) => ({ id: i, name: c.name, color: c.color_hex })));
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pairs = cards.length;

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      clearInterval(t);
      clearTimeout(timer.current);
    };
  }, []);

  const pick = (c: Card) => {
    if (open.length >= 2 || open.includes(c.id) || done.includes(c.name)) return;
    const nextOpen = open.concat(c.id);
    if (nextOpen.length < 2) {
      setOpen(nextOpen);
      return;
    }
    const first = deck.find((x) => x.id === nextOpen[0])!;
    const match = first.name === c.name;
    const nextMoves = moves + 1;
    setOpen(nextOpen);
    setMoves(nextMoves);
    timer.current = setTimeout(
      () => {
        const nextDone = match ? done.concat(c.name) : done;
        setOpen([]);
        setDone(nextDone);
        if (nextDone.length === pairs) onFinish(memoryRaw(nextMoves, pairs), pairs);
      },
      match ? 350 : 800,
    );
  };

  return (
    <div className="glass flex w-full max-w-[720px] flex-col gap-5 rounded-card p-6 sm:px-7 sm:pb-7">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-semibold">
          <HeartIcon size={20} />
          <span className="disp text-xl">{done.length} / {pairs}</span>
          <span className="text-[13px] font-medium text-ink-500">pairs · {moves} moves</span>
        </span>
        <span className="disp text-lg font-semibold tabular-nums" role="timer" aria-label="Elapsed time">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </span>
        <button type="button" className="btn min-h-10 px-3.5 text-sm text-ink-900" style={{ background: "var(--line)" }} onClick={onQuit}>
          Quit
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {deck.map((c) => {
          const isDone = done.includes(c.name);
          const faceUp = isDone || open.includes(c.id);
          return (
            <button key={c.id} type="button" className="gm-mcard" onClick={() => pick(c)} disabled={isDone} aria-label={faceUp ? `${c.name} card` : "Hidden card"}>
              <span className="gm-flip" style={{ transform: faceUp ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <span className="gm-face items-center justify-center" style={{ background: "var(--holo)" }}>
                  <HeartIcon size={26} fill="#fff" />
                </span>
                <span className="gm-face items-end justify-center pb-2.5" style={{ transform: "rotateY(180deg)", background: c.color, opacity: isDone ? 0.65 : 1 }}>
                  <span className="sig text-[clamp(16px,4.5vw,24px)] text-[#2B2440]">{c.name}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
