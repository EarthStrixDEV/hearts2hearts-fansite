"use client";

import { useState, useTransition } from "react";
import { requestTrade, tradeStep } from "@/app/(public)/fan/binder/actions";
import type { MyTrade, TradeMatch } from "@/lib/db/fan-binder";
import { TRADE_STATE_LABEL, tradeActions, type TradeState } from "@/lib/fan/binder";
import s from "./binder.module.css";

const STATE_CHIP: Record<TradeState, string> = { pending: s.chipAmber, accepted: s.chipPink, shipped: s.chipPink, done: s.chipGreen, cancelled: "" };
const cardName = (c: { memberName: string; version: string }) => `${c.memberName} ver. ${c.version}`;

/** Trade matches (top 3), the viewer's trades with their next step, and the safety note. */
export function TradeSidebar({ matches, trades }: { matches: TradeMatch[]; trades: MyTrade[] }) {
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (m: TradeMatch) => {
    const key = `${m.partnerId}:${m.give.id}:${m.get.id}`;
    setError(null);
    start(async () => {
      const res = await requestTrade({ partnerId: m.partnerId, giveCardId: m.give.id, getCardId: m.get.id }).catch(() => ({ ok: false as const, error: "Could not send. Try again." }));
      if (res.ok) setSent((cur) => new Set(cur).add(key));
      else setError(res.error);
    });
  };

  return (
    <aside className={s.aside}>
      <section className={s.card} aria-labelledby="trade-matches">
        <div className={s.cardHead}>
          <span id="trade-matches" className="lbl">Trade matches</span>
          {matches.length > 0 && <span className={`${s.chip} ${s.chipGreen}`}>{matches.length} match{matches.length === 1 ? "" : "es"}</span>}
        </div>
        {matches.length === 0 && <p className={s.note} style={{ margin: 0 }}>No matches yet. Mark cards you have and cards you want: a match appears when another fan has what you want and wants what you have.</p>}
        {matches.map((m) => {
          const key = `${m.partnerId}:${m.give.id}:${m.get.id}`;
          const done = sent.has(key);
          return (
            <div key={key} className={s.item}>
              <span className={s.who}>@{m.partnerName}</span>
              <span className={s.line}>
                Has <b className={s.has}>{cardName(m.get)}</b> · wants <b className={s.wants}>{cardName(m.give)}</b>, which you have
                {m.options > 1 && <> · {m.options} possible swaps</>}
              </span>
              <button type="button" className={`btn btn-s ${s.sBtn}`} disabled={done || pending} onClick={() => send(m)}>
                {done ? "Request sent" : "Send trade request"}
              </button>
            </div>
          );
        })}
        {error && <p className={s.err} role="alert">{error}</p>}
      </section>

      {trades.length > 0 && (
        <section className={s.card} aria-labelledby="my-trades">
          <span id="my-trades" className="lbl">My trades</span>
          {trades.map((t) => <TradeRow key={t.id} t={t} />)}
        </section>
      )}

      <section className={`${s.card} ${s.safe}`}>
        <span className="lbl" style={{ color: "#b9b0d6" }}>Safe trading</span>
        <span className={s.safeText}>Trade ratings, tracked shipping, and meet-ups at public spots only. Never send money outside the platform.</span>
      </section>
    </aside>
  );
}

function TradeRow({ t }: { t: MyTrade }) {
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const actions = tradeActions(t);

  const run = (cmd: Record<string, unknown>) => {
    setError(null);
    start(async () => {
      const res = await tradeStep({ id: t.id, ...cmd }).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className={s.item}>
      <div className={s.cardHead}>
        <span className={s.who}>@{t.partnerName}</span>
        <span className={`${s.chip} ${STATE_CHIP[t.state]}`}>{TRADE_STATE_LABEL[t.state]}</span>
      </div>
      <span className={s.line}>You give <b>{t.give}</b> · you get <b>{t.get}</b></span>
      {t.trackingNo && <span className={s.line}>Tracking: {t.trackingNo}</span>}
      {t.state === "pending" && t.outgoing && <span className={s.line}>Waiting for @{t.partnerName} to accept.</span>}
      {t.state === "shipped" && t.shippedByMe && <span className={s.line}>Waiting for @{t.partnerName} to confirm delivery.</span>}
      {t.state === "done" && t.myRating !== null && <span className={s.line}>You rated {t.myRating}/5{t.theirRating !== null ? ` · they rated ${t.theirRating}/5` : ""}. Update your binder to match.</span>}

      {actions.includes("ship") && (
        <div className={s.field}>
          <label className="lbl" htmlFor={`trk-${t.id}`}>Tracking number</label>
          <input id={`trk-${t.id}`} value={tracking} maxLength={60} onChange={(e) => setTracking(e.target.value)} autoComplete="off" />
        </div>
      )}
      {actions.includes("rate") && (
        <div className={s.field}>
          <span className="lbl" id={`rate-${t.id}`}>Rate this trade</span>
          <div className={s.stars} role="group" aria-labelledby={`rate-${t.id}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={s.star} disabled={busy} aria-label={`Rate ${n} out of 5`} onClick={() => run({ kind: "rate", rating: n })}>{n}</button>
            ))}
          </div>
        </div>
      )}
      {actions.some((a) => a !== "rate") && (
        <div className={s.btnRow}>
          {actions.includes("accept") && <button type="button" className={`btn btn-p ${s.sBtn}`} disabled={busy} onClick={() => run({ kind: "accept" })}>Accept</button>}
          {actions.includes("ship") && <button type="button" className={`btn btn-p ${s.sBtn}`} disabled={busy} onClick={() => run({ kind: "ship", trackingNo: tracking })}>Mark shipped</button>}
          {actions.includes("receive") && <button type="button" className={`btn btn-p ${s.sBtn}`} disabled={busy} onClick={() => run({ kind: "receive" })}>I received it</button>}
          {actions.includes("cancel") && <button type="button" className={`btn btn-s ${s.sBtn}`} disabled={busy} onClick={() => run({ kind: "cancel" })}>{t.outgoing && t.state === "pending" ? "Withdraw" : "Cancel trade"}</button>}
        </div>
      )}
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  );
}
