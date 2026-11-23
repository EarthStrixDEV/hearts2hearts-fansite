"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "./local-board";
import type { PublicQuestion, QuizAnswer } from "./rules";

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

/**
 * The round is server-owned: questions come from /api/game/quiz/start without answers, and every pick is graded by
 * /api/game/quiz/answer (which also returns the explanation). `onFinish` hands back the final signed round token,
 * which is the only thing the leaderboard accepts as proof of the score.
 */
export function QuizView({
  colors,
  seconds = 15,
  onFinish,
  onQuit,
}: {
  colors: Record<string, string>;
  seconds?: number;
  onFinish: (correct: number, total: number, token: string | null) => void;
  onQuit: () => void;
}) {
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAnswer | null>(null);
  const [checkError, setCheckError] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(seconds);
  const token = useRef<string | null>(null);
  const reduced = usePrefersReducedMotion();

  const loadRound = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      const res = await fetch("/api/game/quiz/start", { method: "POST", signal });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(String(j.error ?? res.status));
      token.current = j.token;
      setQuestions(j.questions);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setLoadError("Could not load the questions. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    void loadRound(ctl.signal);
    return () => ctl.abort();
  }, [loadRound]);

  const total = questions?.length ?? 0;
  const q = questions?.[qi] ?? null;
  const answered = picked !== null;
  const right = result?.correct === true;

  // Sends the pick (null = timeout) for grading; the response unlocks the explanation and the next token.
  const submit = useCallback(async (pick: string | null) => {
    setCheckError(false);
    try {
      const res = await fetch("/api/game/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current, pick }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(String(j.error ?? res.status));
      token.current = j.token;
      setResult({ correct: j.correct, answer: j.answer, note: j.note, source: j.source });
      if (j.correct) setScore((s) => s + 1);
    } catch {
      setCheckError(true);
    }
  }, []);

  // 1s countdown per question; hitting 0 locks the question as a timeout.
  useEffect(() => {
    if (!q || picked !== null) return;
    if (time <= 0) {
      setPicked(TIMEOUT);
      void submit(null);
      return;
    }
    const t = setTimeout(() => setTime((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [q, time, picked, submit]);

  const pick = (name: string) => {
    if (picked !== null) return;
    setPicked(name);
    void submit(name);
  };
  const next = () => {
    if (qi + 1 < total) {
      setQi(qi + 1);
      setPicked(null);
      setResult(null);
      setTime(seconds);
    } else onFinish(score, total, token.current);
  };

  const ringColor = time <= 5 ? "#C92A68" : "#8A5CE6";
  const bits = useMemo(() => BITS, []);

  if (!q) {
    return (
      <div className="glass flex w-full max-w-[720px] flex-col items-center gap-4 rounded-card p-8 text-center" aria-live="polite">
        <span className="text-[15px] text-ink-500">{loadError ?? "Loading questions…"}</span>
        <div className="flex gap-3">
          {loadError && <button type="button" className="btn btn-p" onClick={() => void loadRound()}>Try again</button>}
          <button type="button" className="btn btn-s" onClick={onQuit}>Back</button>
        </div>
      </div>
    );
  }

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
            className={cn("gm-ans", result && (n === result.answer ? "ok" : n === picked ? "bad" : "dim"))}
          >
            <span className="block h-3.5 w-3.5 flex-none rounded-full" style={{ background: colors[n] ?? "#C9B6FF" }} />
            {n}
          </button>
        ))}
      </div>

      {answered && !result && (
        <div className="gm-rise flex flex-wrap items-center justify-between gap-3 rounded-tile bg-surface px-5 py-4" aria-live="polite">
          <span className="text-[15px] leading-normal">{checkError ? "Could not check your answer. Check your connection and try again." : "Checking…"}</span>
          {checkError && (
            <button type="button" className="btn btn-p" onClick={() => void submit(picked === TIMEOUT ? null : picked)}>Try again</button>
          )}
        </div>
      )}

      {answered && result && (
        <div className="gm-rise flex flex-wrap items-center justify-between gap-3 rounded-tile bg-surface px-5 py-4" aria-live="polite">
          <span className="text-[15px] leading-normal">
            <strong>{right ? "Correct!" : picked === TIMEOUT ? `Time’s up, it was ${result.answer}.` : `It was ${result.answer}.`}</strong> {result.note}
            {result.source && result.source.url.startsWith("https://") && (
              <>
                {" "}
                <a href={result.source.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[13px]">Source: {result.source.label} ↗</a>
              </>
            )}
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
