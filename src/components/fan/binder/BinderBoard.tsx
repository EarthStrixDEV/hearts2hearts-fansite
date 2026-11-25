"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setCardState } from "@/app/(public)/fan/binder/actions";
import { safeHex } from "@/components/fan/theme";
import type { BinderAlbum, BinderCard, MyTrade, TradeMatch } from "@/lib/db/fan-binder";
import { nextSlotState, tallyBinder, type SlotState } from "@/lib/fan/binder";
import s from "./binder.module.css";
import { TradeSidebar } from "./TradeSidebar";

export interface BinderBoardProps {
  albums: BinderAlbum[];
  albumId: string | null;
  cards: BinderCard[];
  matches: TradeMatch[];
  trades: MyTrade[];
}

const STATUS: Record<SlotState, string> = { missing: "Missing", have: "Have", want: "Want" };
const BADGE: Record<SlotState, string> = { missing: s.badgeMissing, have: s.badgeHave, want: s.badgeWant };

/** Binder grid with optimistic slots (tap: missing -> have -> want -> missing). Keyed by album by the page, so each album starts fresh. */
export function BinderBoard({ albums, albumId, cards, matches, trades }: BinderBoardProps) {
  const [states, setStates] = useState<Record<string, SlotState>>(() => Object.fromEntries(cards.map((c) => [c.id, c.state])));
  const [error, setError] = useState<string | null>(null);
  const [, startSave] = useTransition();

  const tally = tallyBinder(cards.map((c) => states[c.id] ?? c.state));

  const tap = (card: BinderCard) => {
    const prev = states[card.id] ?? card.state;
    const next = nextSlotState(prev);
    setError(null);
    setStates((cur) => ({ ...cur, [card.id]: next }));
    startSave(async () => {
      const res = await setCardState({ photocardId: card.id, state: next }).catch(() => ({ ok: false as const, error: "Could not save. Try again." }));
      if (!res.ok) {
        // roll back only this slot, and only if it was not tapped again meanwhile
        setStates((cur) => (cur[card.id] === next ? { ...cur, [card.id]: prev } : cur));
        setError(res.error);
      }
    });
  };

  return (
    <div className={s.root}>
      <div className={s.col}>
        <div className={s.head}>
          <div className={s.headText}>
            <Link href="/fan" className={s.back}>← S2U hub</Link>
            <span className={`lbl ${s.kicker}`}>Collect · photocard binder</span>
            <h1 className={`disp ${s.title}`}>Your binder, without the spreadsheet</h1>
            <p className={s.lede}>Tap a slot to switch it: missing → have → want.</p>
          </div>
          <div className={s.tallies} aria-live="polite">
            <div className={s.tally}><span className="lbl">Have</span><span className={`disp ${s.tallyNum}`} style={{ color: "#2e9b6e" }}>{tally.have}</span></div>
            <div className={s.tally}><span className="lbl">Want</span><span className={`disp ${s.tallyNum}`} style={{ color: "var(--pink-700)" }}>{tally.want}</span></div>
            <div className={s.tally}><span className="lbl">Complete</span><span className={`disp ${s.tallyNum}`}>{tally.pct}%</span></div>
          </div>
        </div>

        <nav className={s.sets} aria-label="Card sets">
          <span className="lbl" style={{ marginRight: 4 }}>Set</span>
          {albums.map((a) => (
            <Link key={a.id} href={`/fan/binder?album=${a.id}`} className={`${s.setChip} ${a.id === albumId ? s.setChipOn : ""}`} aria-current={a.id === albumId ? "page" : undefined}>
              {a.title} · {a.cards} cards
            </Link>
          ))}
        </nav>

        {error && <p className={s.err} role="alert">{error}</p>}

        <div className={s.layout}>
          {cards.length === 0 ? (
            <section className={`${s.card} ${s.empty}`}>
              <span className="lbl">No cards yet</span>
              <p className={s.note} style={{ margin: 0 }}>No photocard sets are published yet. Check back after the next card list is added.</p>
            </section>
          ) : (
            <section className={s.board} aria-label="Photocard slots">
              {cards.map((c) => {
                const st = states[c.id] ?? c.state;
                return (
                  <button key={c.id} type="button" className={s.slot} onClick={() => tap(c)} aria-label={`${c.memberName} version ${c.version}, ${st}`}>
                    <span className={`${s.face} ${s[st]}`} style={{ "--m": safeHex(c.color, "#ffb3cf") } as React.CSSProperties}>
                      <span className={`${s.badge} ${BADGE[st]}`}>{STATUS[st]}</span>
                      <span className={`disp ${s.name}`}>{c.memberName}</span>
                    </span>
                    <span className={s.ver}>Ver. {c.version}</span>
                  </button>
                );
              })}
            </section>
          )}
          <TradeSidebar matches={matches} trades={trades} />
        </div>
      </div>
    </div>
  );
}
