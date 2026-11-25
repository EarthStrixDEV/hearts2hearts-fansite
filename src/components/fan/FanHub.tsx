"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import type { FanCountdown, FanEra } from "@/lib/db/fan";
import { CountdownHero } from "./CountdownHero";
import s from "./fan.module.css";
import { parseStoredTheme, resolveTheme, type ThemeMember, type ThemeState } from "./theme";

export interface FanHubProps {
  fandomName: string;
  /** null = guest */
  me: { nickname: string; day: number } | null;
  members: ThemeMember[];
  eras: FanEra[];
  /** Saved choice of a signed-in fan (or the default for a guest). */
  initialTheme: ThemeState;
  countdown: FanCountdown | null;
  whenText: string | null;
  serverNow: number;
  wrappedYear: number;
  saveTheme: (t: ThemeState) => Promise<{ saved: boolean }>;
}

// Guest choice lives in localStorage (every access is guarded: private mode / blocked storage must not break the page).
const KEY = "h2h:fan-theme";
const listeners = new Set<() => void>();
const readGuest = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeGuest = (t: ThemeState) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* not saved, still applied for this visit */ } listeners.forEach((l) => l()); };
const subscribeGuest = (cb: () => void) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; };

const FEATURES = (year: number) => [
  { k: "Schedule", t: "AI notice reader", d: "Korean notice image into Thai-time events", href: "/fan/schedule-reader" },
  { k: "Collect", t: "Photocard binder", d: "Have, want, and trade matches", href: "/fan/binder" },
  { k: "Yearly", t: `S2U Wrapped ${year}`, d: "Your year as a fan, ready to share", href: `/fan/wrapped/${year}` },
  { k: "Space", t: "My room", d: "Decorate with what you’ve earned", href: "/fan/room" },
  { k: "Letters", t: "Time capsule", d: "Opens on the next anniversary", href: "/fan/capsule" },
];

export function FanHub(p: FanHubProps) {
  const signedIn = p.me !== null;
  const [override, setOverride] = useState<ThemeState | null>(null);
  const [stageOverride, setStageOverride] = useState<string | null>(null);
  const [, startSave] = useTransition();
  const guestRaw = useSyncExternalStore(subscribeGuest, readGuest, () => null);

  const state = override ?? (signedIn ? p.initialTheme : parseStoredTheme(guestRaw, p.members, p.eras) ?? p.initialTheme);
  const theme = resolveTheme(state, p.members, p.eras);
  const stage = p.members.find((m) => m.id === (stageOverride ?? state.biasId)) ?? p.members[0] ?? null;

  const choose = (next: ThemeState) => {
    setOverride(next);
    if (signedIn) startSave(async () => { await p.saveTheme(next).catch(() => ({ saved: false })); });
    else writeGuest(next);
  };
  const pickBias = (id: string) => { setStageOverride(id); choose({ mode: "bias", biasId: id, eraId: state.eraId }); };
  const pickEra = (id: string) => choose({ mode: "era", biasId: state.biasId, eraId: id });

  const vars = { "--accent": theme.accent, "--page-tint": theme.pageTint, "--hero-from": theme.heroFrom, "--hero-to": theme.heroTo } as CSSProperties;
  const grad = (e: Pick<FanEra, "from" | "to">) => `linear-gradient(135deg, ${e.from}, ${e.to})`;
  const pillVar = (c: string) => ({ "--pill-c": c }) as CSSProperties;

  return (
    <div className={s.root} style={vars}>
      <div className={s.col}>
        {/* welcome */}
        <div className={`glass ${s.welcome}`}>
          <div className={s.welcomeL}>
            <span className={s.avatar}><HeartIcon size={26} fill="#fff" /></span>
            <div className={s.welcomeText}>
              {p.me ? (
                <>
                  <span className={`disp ${s.welcomeName}`}>Welcome back, {p.me.nickname}</span>
                  <span className={s.muted}>Today is day <b style={{ color: "var(--pink-700)" }}>{p.me.day}</b> you’ve been part of {p.fandomName}. Thanks for staying.</span>
                </>
              ) : (
                <>
                  <span className={`disp ${s.welcomeName}`}>Welcome to {p.fandomName}</span>
                  <span className={s.muted}><Link href="/auth/sign-in">Sign in</Link> to save your bias and count your days with the fandom.</span>
                </>
              )}
            </div>
          </div>
          <span className={`sig ${s.themeLabel}`} aria-live="polite">{theme.label}</span>
        </div>

        {/* bias mode + era theming */}
        <section className="panel" aria-labelledby="fan-bias">
          <div className={s.head}>
            <div className={s.headText}>
              <span className="lbl">Bias mode</span>
              <h2 id="fan-bias" className={`disp ${s.h2}`}>Who’s your bias? The site wears her color.</h2>
            </div>
            <button type="button" className={s.pill} onClick={() => choose({ ...state, mode: "era" })}>Use era colors instead</button>
          </div>
          <div className={s.row}>
            {p.members.map((m) => (
              <button key={m.id} type="button" aria-pressed={theme.bias?.id === m.id} className={`${s.pill} ${theme.bias?.id === m.id ? s.pillOn : ""}`} style={pillVar(m.color)} onClick={() => pickBias(m.id)}>
                <span className={s.dot} style={{ background: m.color }} />{m.name}
              </button>
            ))}
          </div>
          <div className={s.sub}>
            <span className="lbl">Era theming</span>
            <div className={s.row}>
              {p.eras.map((e) => {
                const on = !theme.bias && theme.era.id === e.id;
                return (
                  <button key={e.id} type="button" aria-pressed={on} className={`${s.pill} ${on ? s.pillOn : ""}`} style={pillVar("#C92A68")} onClick={() => pickEra(e.id)}>
                    <span className={s.dot} style={{ background: grad(e) }} />{e.title}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <CountdownHero countdown={p.countdown} serverNow={p.serverNow} whenText={p.whenText} />

        {/* member stage */}
        {stage && (
          <section className={s.stage} aria-labelledby="fan-stage">
            <div className={s.stageHead}>
              <span className="lbl" style={{ color: "#B9B0D6" }}>Member stage</span>
              <h2 id="fan-stage" className={`disp ${s.h2}`}>Tap a name to bring her into the spotlight</h2>
            </div>
            <div className={s.stageArea}>
              <span className={s.cone} style={{ background: `linear-gradient(180deg, ${stage.color}cc, rgba(255,255,255,0))` }} aria-hidden="true" />
              <div className={s.stageBody}>
                <div className={s.photo} style={{ background: `linear-gradient(165deg, ${stage.color}, #FFF8F3 130%)` }}>
                  {stage.photo ? <Photo src={stage.photo} alt={`${stage.name}`} /> : <span>Photo coming soon</span>}
                </div>
                <span className={`disp ${s.stageName}`}>{stage.name} {stage.ko && <span className={s.stageKo}>{stage.ko}</span>}</span>
              </div>
            </div>
            <div className={s.stagePills}>
              {p.members.map((m) => (
                <button key={m.id} type="button" aria-pressed={stage.id === m.id} className={`${s.stagePill} ${stage.id === m.id ? s.stagePillOn : ""}`} style={pillVar(m.color)} onClick={() => setStageOverride(m.id)}>{m.name}</button>
              ))}
            </div>
          </section>
        )}

        {/* discography shelf */}
        <section className="panel" aria-labelledby="fan-shelf" style={{ gap: 24 }}>
          <div className={s.head}>
            <div className={s.headText}>
              <span className="lbl">Discography shelf</span>
              <h2 id="fan-shelf" className={`disp ${s.h2}`}>Pull a record. The page changes to that era.</h2>
            </div>
            <Button href="/music">Open music page</Button>
          </div>
          <div className={s.shelf}>
            {p.eras.map((e) => {
              const on = theme.era.id === e.id;
              return (
                <button key={e.id} type="button" aria-label={e.title} aria-pressed={on} className={`${s.record} ${on ? s.recordUp : ""}`} onClick={() => pickEra(e.id)}>
                  <span className={`${s.disc} ${on ? s.discSpin : ""}`} style={{ "--g": grad(e) } as CSSProperties} />
                  <span className={`disp ${s.recordName}`}>{e.title}</span>
                </button>
              );
            })}
          </div>
          {p.eras.length > 0 && (
            <div className={s.now}>
              <span className={`chip ${s.nowChip}`} style={{ "--g": grad(theme.era) } as CSSProperties}>Now showing</span>
              <span className="disp" style={{ fontSize: 20, fontWeight: 600 }}>{theme.era.title}</span>
              <span className={s.muted}>{theme.era.sub}</span>
            </div>
          )}
        </section>

        {/* features */}
        <section className={s.features} aria-label="More for S2U">
          {FEATURES(p.wrappedYear).map((f) => (
            <Link key={f.href} href={f.href} className={`panel ${s.feature}`} style={{ gap: 6 }}>
              <span className="lbl">{f.k}</span>
              <span className={`disp ${s.featureTitle}`}>{f.t}</span>
              <span className={s.muted} style={{ fontSize: 13 }}>{f.d}</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
