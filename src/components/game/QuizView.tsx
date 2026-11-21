"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { cn } from "@/lib/utils";
import type { QuestionPayload } from "@/lib/db/seed/game";
import { usePrefersReducedMotion } from "./local-board";

const TIMEOUT = "__timeout";
const RING = 138.2;
const BITS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return {
    dx: Math.round(Math.cos(a) * (160 + (i % 3) * 50)),
    dy: Math.round(Math.sin(a) * (110 + (i % 4) * 30)),
    r: (i * 47) % 360,
    s: 14 + (i % 3) * 6,
    d: (i % 4) * 40,
    c: ["#FF8FB8", "#C9B6FF", "#A8D8FF", "#FFD25E"][i % 4],
  };
});

export function QuizView({
  questions,
  colors,
  seconds = 15,
  onFinish,
  onQuit,
}: {
  questions: QuestionPayload[];
  colors: Record<string, string>;
  seconds?: number;
  onFinish: (correct: number, total: number) => void;
  onQuit: () => void;
}) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(seconds);
  const reduced = usePrefersReducedMotion();

  const total = questions.length;
  const q = questions[qi];
  const answered = picked !== null;
  const right = answered && picked === q.answer;

  // 1s countdown per question; hitting 0 locks the question as a timeout.
  useEffect(() => {
    if (picked !== null) return;
    if (time <= 0) {
      setPicked(TIMEOUT);
      return;
    }
    const t = setTimeout(() => setTime((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [time, picked]);

  const pick = (name: string) => {
    if (picked !== null) return;
    setPicked(name);
    if (name === q.answer) setScore((s) => s + 1);
  };
  const next = () => {
    if (qi + 1 < total) {
      setQi(qi + 1);
      setPicked(null);
      setTime(seconds);
    } else onFinish(score, total);
  };

  const ringColor = time <= 5 ? "#C92A68" : "#8A5CE6";
  const bits = useMemo(() => BITS, []);

  return (
    <div className="glass relative flex w-full max-w-[720px] flex-col gap-[22px] overflow-hidden rounded-card p-6 sm:px-7 sm:pb-7">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-semibold">
          <HeartIcon size={20} />
          <span className="disp text-xl">{score}</span>
          <span className="text-[13px] font-medium text-ink-500">score</span>
        </span>
        <span role="timer" aria-label={`${time} seconds left`} className="relative inline-flex h-[52px] w-[52px] items-center justify-center">
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="absolute inset-0 -rotate-90">
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(43,36,64,.1)" strokeWidth="5" />
            <circle cx="26" cy="26" r="22" fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={(RING * (1 - time / seconds)).toFixed(1)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <span className="disp text-lg font-semibold tabular-nums">{time}</span>
        </span>
        <button type="button" className="btn min-h-10 px-3.5 text-sm text-ink-900" style={{ background: "var(--line)" }} onClick={onQuit}>
          Quit
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-[13px] text-ink-500">Question {qi + 1} of {total}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full transition-[width] duration-[400ms]" style={{ width: `${Math.round(((qi + (answered ? 1 : 0)) / total) * 100)}%`, background: "var(--holo-deep)" }} />
        </div>
      </div>

      <h2 className="disp my-1 text-center text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[30px]">{q.text}</h2>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))" }}>
        {q.options.map((n) => (
          <button
            key={n}
            type="button"
            disabled={answered}
            onClick={() => pick(n)}
            className={cn("gm-ans", answered && (n === q.answer ? "ok" : n === picked ? "bad" : "dim"))}
          >
            <span className="block h-3.5 w-3.5 flex-none rounded-full" style={{ background: colors[n] ?? "#C9B6FF" }} />
            {n}
          </button>
        ))}
      </div>

      {answered && (
        <div className="gm-rise flex flex-wrap items-center justify-between gap-3 rounded-tile bg-surface px-5 py-4" aria-live="polite">
          <span className="text-[15px] leading-normal">
            <strong>{right ? "Correct!" : picked === TIMEOUT ? `Time’s up, it was ${q.answer}.` : `It was ${q.answer}.`}</strong> {q.note}
          </span>
          <button type="button" className="btn btn-p" onClick={next}>
            {qi + 1 < total ? "Next question" : "See result"}
          </button>
        </div>
      )}

      {right && !reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {bits.map((b, i) => (
            <svg key={i} className="gm-conf" width={b.s} height={b.s} viewBox="0 0 24 24" style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px`, "--rot": `${b.r}deg`, animationDelay: `${b.d}ms` } as React.CSSProperties}>
              <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z" fill={b.c} />
            </svg>
          ))}
        </div>
      )}
    </div>
  );
}
