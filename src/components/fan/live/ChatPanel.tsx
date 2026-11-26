"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cooldownRemainingMs, MAX_MESSAGE_LEN, toneColor, type FeedMessage, type RoomPhase } from "@/lib/fan/live";
import s from "./live.module.css";
import { useClockSelect, type RoomClock } from "./roomClock";
import type { SendResult } from "./useLiveRoom";

interface Props {
  clock: RoomClock;
  messages: FeedMessage[];
  signedIn: boolean;
  /** null = this countdown has no waiting room yet */
  phase: RoomPhase | null;
  slowModeSec: number;
  lastSentAt: number | null;
  canRead: boolean;
  send: (body: string) => Promise<SendResult>;
}

const ERRORS: Record<Exclude<SendResult, { ok: true }>["reason"], string> = {
  slow_mode: "Slow mode is on, wait a moment.",
  closed: "The room is closed right now.",
  not_allowed: "Your account can’t chat right now.",
  sign_in: "Sign in to chat.",
  network: "Couldn’t send. Check your connection and try again.",
};

/** Room chat. Guests see why they can’t read it; signed-in fans get a slow-mode aware composer. */
export function ChatPanel({ clock, messages, signedIn, phase, slowModeSec, lastSentAt, canRead, send }: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLUListElement>(null);
  const stick = useRef(true);

  // seconds of slow-mode wait left on the server-synced clock (0 = can send)
  const wait = useClockSelect(clock, (now) => Math.ceil(cooldownRemainingMs(lastSentAt, slowModeSec, now) / 1000)) ?? 0;

  // keep the newest message in view unless the fan scrolled up to read
  useEffect(() => {
    const el = logRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const open = signedIn && phase === "open";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy || wait > 0) return;
    setBusy(true);
    setError(null);
    const r = await send(body);
    setBusy(false);
    if (r.ok) setDraft("");
    else setError(ERRORS[r.reason]);
  };

  return (
    <aside className={s.chat} aria-labelledby="room-chat">
      <span id="room-chat" className="lbl" style={{ opacity: 0.75 }}>Room chat</span>
      {signedIn && canRead && messages.length > 0 ? (
        <ul
          ref={logRef}
          className={s.log}
          role="log"
          aria-live="polite"
          aria-label="Room chat messages"
          tabIndex={0}
          onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }}
        >
          {messages.map((m) => (
            <li key={m.id} className={s.msg}>
              <span className={s.avatar} style={{ background: toneColor(m.tone) }} aria-hidden="true" />
              <span className={s.msgBody}>
                <span className={s.who}>@{m.name}</span>
                <span className={s.text}>{m.body}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.empty} style={{ flex: 1, minHeight: 240 }}>
          {!signedIn ? (
            <>Guests can watch the countdown and see who’s here. <Link href="/auth/sign-in">Sign in</Link> to read the chat and say something to S2U.</>
          ) : phase === null ? (
            "The chat opens together with the waiting room."
          ) : (
            "No messages yet. Be the first to say hi."
          )}
        </p>
      )}

      <form className={s.form} onSubmit={submit}>
        <label htmlFor="room-msg" className={s.srOnly}>Message</label>
        <input
          id="room-msg"
          className={s.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_MESSAGE_LEN}
          autoComplete="off"
          disabled={!open}
          placeholder={!signedIn ? "Sign in to chat" : phase === "open" ? "Say something to S2U" : phase === "before" ? "Chat opens soon" : "Chat is closed"}
        />
        <button type="submit" className={`${s.btn} ${s.btnP} ${s.send}`} disabled={!open || busy || wait > 0 || draft.trim() === ""}>
          {wait > 0 ? `${wait}s` : "Send"}
        </button>
      </form>
      <p className={`${s.status} ${error ? s.statusErr : ""}`} role="status" aria-live="polite">
        {error ?? (open && wait > 0 ? `Slow mode: one message every ${slowModeSec}s.` : "")}
      </p>
    </aside>
  );
}
