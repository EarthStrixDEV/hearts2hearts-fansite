"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Days / hours / min / sec until `startsAt`. Renders "––" until mounted so server and client markup match. */
export function Countdown({ startsAt }: { startsAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = Date.parse(startsAt);
  const s = now === null || Number.isNaN(target) ? null : Math.max(0, Math.floor((target - now) / 1000));
  const units = [
    { l: "Days", v: s === null ? null : Math.floor(s / 86400) },
    { l: "Hours", v: s === null ? null : Math.floor((s % 86400) / 3600) },
    { l: "Min", v: s === null ? null : Math.floor((s % 3600) / 60) },
    { l: "Sec", v: s === null ? null : s % 60 },
  ];
  return (
    <div className="relative grid gap-2.5" style={{ gridTemplateColumns: "repeat(4, minmax(64px, 88px))" }} role="timer" aria-label="Time until the next event">
      {units.map((u) => (
        <div key={u.l} className="flex flex-col items-center gap-1.5">
          <span className="disp w-full rounded-2xl py-3.5 text-center text-[34px] font-semibold tabular-nums" style={{ background: "rgba(255,255,255,.9)", boxShadow: "0 10px 20px rgba(43,36,64,.12)" }}>
            {u.v === null ? "––" : pad(u.v)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.08em]">{u.l}</span>
        </div>
      ))}
    </div>
  );
}
