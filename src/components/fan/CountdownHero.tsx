"use client";

import { Button } from "@/components/ui/Button";
import type { FanCountdown } from "@/lib/db/fan";
import { formatZoned, ICT, splitRemaining } from "@/lib/fan/time";
import s from "./fan.module.css";
import { useServerNow } from "./useServerNow";

const pad = (n: number) => String(n).padStart(2, "0");

function Lock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Countdown hero. Ticks from the server's clock (`serverNow`); teaser slots open at their `unlockAt`. */
export function CountdownHero({ countdown, serverNow, whenText }: { countdown: FanCountdown | null; serverNow: number; whenText: string | null }) {
  const now = useServerNow(serverNow);

  if (!countdown) {
    return (
      <section className={s.hero} aria-labelledby="fan-hero-title">
        <div className={s.heroL}>
          <span className="chip" style={{ alignSelf: "flex-start", background: "#2B2440", color: "#fff" }}>Countdown</span>
          <h1 id="fan-hero-title" className={`disp ${s.heroTitle}`}>Next comeback: TBA</h1>
          <p className={s.heroText}>No date has been announced yet. When it is, this hero switches to the comeback countdown.</p>
        </div>
      </section>
    );
  }

  const target = Date.parse(countdown.targetAt);
  const r = now === null ? null : splitRemaining(target, now);
  const units = [
    { l: "Days", v: r?.d }, { l: "Hours", v: r?.h }, { l: "Min", v: r?.m }, { l: "Sec", v: r?.s },
  ];

  return (
    <section className={s.hero} aria-labelledby="fan-hero-title">
      <div className={s.heroL}>
        <span className="chip" style={{ alignSelf: "flex-start", background: "#2B2440", color: "#fff" }}>Countdown</span>
        <h1 id="fan-hero-title" className={`disp ${s.heroTitle}`}>{countdown.title}</h1>
        {whenText && <p className={s.heroText}>{whenText}</p>}
        <div className={s.ctas}>
          <Button href={`/fan/live/${countdown.id}`}>Join the waiting room</Button>
          {/* plain link: a file download, not a page, so no prefetch */}
          <a className="btn btn-s" href={`/api/fan/ics?countdown=${countdown.id}`} style={{ color: "var(--pink-700)" }}>Add to calendar</a>
        </div>
      </div>
      <div className={s.heroR}>
        <div className={s.clock} role="timer" aria-label={`Time until ${countdown.title}`}>
          {units.map((u) => (
            <div key={u.l} className={s.unit}>
              <span className={`disp ${s.unitNum}`}>{u.v === undefined ? "––" : pad(u.v)}</span>
              <span className={s.unitLbl}>{u.l}</span>
            </div>
          ))}
        </div>
        {countdown.teasers.length > 0 && (
          <>
            <ul className={s.teasers} style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {countdown.teasers.map((t, i) => {
                const open = now !== null && t.unlockAt !== null && Date.parse(t.unlockAt) <= now;
                return (
                  <li key={i} className={`${s.teaser} ${open ? s.teaserOpen : ""}`}>
                    {!open && <Lock />}
                    <span>{t.label}</span>
                    {!open && t.unlockAt && <span>{formatZoned(t.unlockAt, ICT, false)}</span>}
                  </li>
                );
              })}
            </ul>
            <span className={s.heroNote}>Teasers unlock on the real release schedule (Thai time).</span>
          </>
        )}
      </div>
    </section>
  );
}
