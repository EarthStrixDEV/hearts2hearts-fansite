"use client";

import Link from "next/link";
import { useState, useTransition, type CSSProperties } from "react";
import { formatDayZoned } from "@/lib/fan/anniversary";
import { EMPTY_ERROR, GROUP_NAME, MAX_BODY, PAPERS, paperColor, type PaperId, type SealInput } from "@/lib/fan/capsule";
import { KST } from "@/lib/fan/time";
import s from "./capsule.module.css";

export interface ShelfEntry {
  id: string;
  to: string;
  paper: string;
  /** "Feb 24, 2026" (Thai calendar day) */
  sealedOn: string;
  locked: boolean;
}

export interface CapsuleStudioProps {
  nickname: string;
  anniversary: string; // "2nd"
  /** "Feb 24, 2027" (KST calendar day) */
  openLabel: string;
  /** "00:00 KST on Feb 24, 2027, which is Feb 23, 2027, 22:00 in Thailand (ICT)" */
  whenText: string;
  daysLeft: number;
  fandomCount: number;
  shelf: ShelfEntry[];
  seal: (input: SealInput) => Promise<{ ok: true; openAt: string } | { ok: false; error: string }>;
}

type To = SealInput["toKind"];
const TO: { kind: To; label: string }[] = [
  { kind: "group", label: GROUP_NAME },
  { kind: "self", label: "Future me" },
];

export function CapsuleStudio(p: CapsuleStudioProps) {
  const [to, setTo] = useState<To>("group");
  const [paper, setPaper] = useState<PaperId>("sky");
  const [text, setText] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [err, setErr] = useState("");
  const [sealedFor, setSealedFor] = useState<string | null>(null);
  const [pending, startSeal] = useTransition();

  const toLabel = TO.find((t) => t.kind === to)!.label;
  const vars = { "--paper": paperColor(paper) } as CSSProperties;
  const plural = p.fandomCount === 1;

  const sealIt = () => {
    if (!text.trim()) { setErr(EMPTY_ERROR); return; }
    startSeal(async () => {
      const r = await p.seal({ toKind: to, paper, body: text, fanbookOptIn: to === "group" && optIn }).catch(() => null);
      if (r?.ok) { setSealedFor(formatDayZoned(r.openAt, KST)); setErr(""); }
      else setErr(r?.error ?? "Couldn’t seal your letter. Nothing was saved, please try again.");
    });
  };
  const again = () => { setSealedFor(null); setText(""); setOptIn(false); setErr(""); };

  return (
    <div className={s.root}>
      <div className={s.col}>
        <div className={s.head}>
          <Link href="/fan" className={s.back}>← S2U hub</Link>
          <span className={`lbl ${s.eyebrow}`}>Letters · time capsule</span>
          <h1 className={`disp ${s.h1}`}>Write now. Open it on {p.openLabel}.</h1>
          <p className={s.lead}>
            Sealed letters can’t be read, even by you, until the {p.anniversary} anniversary. Opens in <b>{p.daysLeft.toLocaleString("en-US")} {p.daysLeft === 1 ? "day" : "days"}</b>.
          </p>
        </div>

        <div className={s.grid}>
          <section className={`panel ${s.main}`} aria-label="Write a letter">
            <div className={s.field} role="group" aria-labelledby="cap-to">
              <span id="cap-to" className={`lbl ${s.fieldLbl}`}>To</span>
              {TO.map((t) => (
                <button key={t.kind} type="button" aria-pressed={to === t.kind} className={`${s.pill} ${to === t.kind ? s.pillOn : ""}`} onClick={() => setTo(t.kind)}>{t.label}</button>
              ))}
            </div>
            <div className={s.field} role="group" aria-labelledby="cap-paper">
              <span id="cap-paper" className={`lbl ${s.fieldLbl}`}>Paper</span>
              {PAPERS.map((pp) => (
                <button key={pp.id} type="button" aria-label={pp.name} aria-pressed={paper === pp.id} className={`${s.swatch} ${paper === pp.id ? s.swatchOn : ""}`} style={{ "--c": pp.color } as CSSProperties} onClick={() => setPaper(pp.id)} />
              ))}
            </div>

            {sealedFor === null ? (
              <>
                <div className={s.paper} style={vars}>
                  <span className={`sig ${s.dear}`}>Dear {toLabel},</span>
                  <label htmlFor="letter" className="sr-only">Your letter</label>
                  <textarea
                    id="letter"
                    className={s.textarea}
                    value={text}
                    maxLength={MAX_BODY}
                    placeholder="What do you want to remember about this year?"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? "cap-err" : undefined}
                    onChange={(e) => { setText(e.target.value.slice(0, MAX_BODY)); setErr(""); }}
                  />
                  <span className={`sig ${s.signed}`}>— {p.nickname}, S2U</span>
                </div>

                {to === "group" && (
                  <label className={s.optin}>
                    <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                    <span>Include my letter in the fan book on opening day <span className={s.optinNote}>(optional, only letters you opt in are gathered)</span></span>
                  </label>
                )}

                <div className={s.actions}>
                  <button type="button" className="btn btn-p" onClick={sealIt} disabled={pending} aria-busy={pending || undefined}>Seal until {p.openLabel}</button>
                  <span id="cap-err" role="alert" className={s.err}>{err}</span>
                  <span className={s.count}>{text.length.toLocaleString("en-US")} / {MAX_BODY.toLocaleString("en-US")}</span>
                </div>
                <p className={s.when}>Opens at {p.whenText}.</p>
              </>
            ) : (
              <div className={s.sealed} role="status">
                <div className={s.envelope} style={vars} aria-hidden="true">
                  <span className={s.flap} />
                  <span className={s.wax}>
                    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z" fill="#fff" /></svg>
                  </span>
                </div>
                <span className={`disp ${s.sealedTitle}`}>Sealed. See you on {sealedFor}.</span>
                <span className={s.sealedNote}>We’ll send a reminder that morning, Thai time.</span>
                <button type="button" className="btn btn-s" onClick={again}>Write another</button>
              </div>
            )}
          </section>

          <aside className={s.aside}>
            <section className="panel" style={{ gap: 12 }} aria-labelledby="cap-shelf">
              <span id="cap-shelf" className="lbl">Your capsule</span>
              {p.shelf.length === 0 ? (
                <p className={s.empty}>No letters yet. The first one you seal shows up here.</p>
              ) : (
                <ul className={s.shelf}>
                  {p.shelf.map((l) => (
                    <li key={l.id} className={s.item}>
                      <span className={s.mini} style={{ "--c": paperColor(l.paper) } as CSSProperties} aria-hidden="true" />
                      <span className={s.itemText}>
                        <span className={s.itemTo}>To {l.to}</span>
                        <span className={s.itemDate}>Sealed {l.sealedOn}</span>
                      </span>
                      <span className={`chip ${s.state}`}>{l.locked ? "Locked" : "Opened"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`panel ${s.fandom}`} style={{ gap: 10 }} aria-labelledby="cap-fandom">
              <span id="cap-fandom" className={`lbl ${s.fandomLbl}`}>Fandom capsule</span>
              <span className={`disp ${s.fandomNum}`}>{p.fandomCount.toLocaleString("en-US")}</span>
              <span className={s.fandomText}>
                {plural ? "letter" : "letters"} from S2U {plural ? "is" : "are"} waiting. On opening day, letters to the girls can be gathered into a fan book, only from fans who opt in.
              </span>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
