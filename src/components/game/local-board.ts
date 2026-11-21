// "This device" leaderboard: top 10 rounds in localStorage (same key + shape as the design).
import { useEffect, useState } from "react";

export interface LocalEntry { game: string; score: string; pct: number; date: string }
const KEY = "h2h-board-v1";

export function readBoard(): LocalEntry[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((e) => e && typeof e.game === "string" && typeof e.pct === "number") : [];
  } catch {
    return [];
  }
}

export function addToBoard(entry: LocalEntry): LocalEntry[] {
  const next = readBoard().concat([entry]).sort((a, b) => b.pct - a.pct).slice(0, 10);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function usePrefersReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const on = (e: MediaQueryListEvent) => setRm(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return rm;
}
