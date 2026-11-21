"use client";

import { useEffect, useState } from "react";
import s from "./schedule.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** "Next up" banner. Renders `--` until mounted so the server HTML never disagrees with the client clock. */
export function CountdownBadge({ title, meta, target }: { title: string; meta: string; target: string }) {
  const [now, setNow] = useState<number | null>(null);
  const end = Date.parse(target);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  let left = now === null ? null : Math.max(0, Math.floor((end - now) / 1000));
  const units: [string, string, number | null][] = [];
  for (const [label, size] of [["Days", 86400], ["Hours", 3600], ["Min", 60], ["Sec", 1]] as const) {
    units.push([label, left === null ? "--" : pad(Math.floor(left / size)), left === null ? null : Math.floor(left / size)]);
    if (left !== null) left %= size;
  }

  return (
    <section aria-label="Countdown to next event" className={s.countdown}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 240 }}>
        <span className="chip" style={{ alignSelf: "flex-start", background: "#2B2440", color: "#fff" }}>Next up</span>
        <span className="disp" style={{ fontSize: 30, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 15 }}>{meta}</span>
      </div>
      <div role="timer" aria-label={`Time until ${title}`} className={s.units}>
        {units.map(([label, text, n]) => (
          <div key={label} className={s.unit}>
            <div className={s.flipbox}>
              {/* key restarts the flip animation each time the value changes */}
              <span key={text} className={`disp ${s.digits} ${n === null ? "" : n % 2 ? s.flipA : s.flipB}`}>{text}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
