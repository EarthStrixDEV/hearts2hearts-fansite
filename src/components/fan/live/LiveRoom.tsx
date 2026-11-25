"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { LiveCountdown, LiveRoomInfo } from "@/lib/db/fan-live";
import { formatClock, isFlood, roomPhase, type RoomPhase } from "@/lib/fan/live";
import { formatZoned, ICT } from "@/lib/fan/time";
import { ChatPanel } from "./ChatPanel";
import s from "./live.module.css";
import { useClockSelect } from "./roomClock";
import { useLiveRoom } from "./useLiveRoom";

export interface LiveRoomProps {
  countdown: LiveCountdown;
  /** null = no live_rooms row yet: the countdown and the flood still work, chat and cheers wait */
  room: LiveRoomInfo | null;
  signedIn: boolean;
  fandomName: string;
  /** site_settings.fandom.color, validated on the server */
  floodColor: string;
  serverNow: number;
  whenText: string;
}

const PREVIEW_SEC = 15;
const fmt = (n: number) => n.toLocaleString("en-US");

const PHASE_NOTE: Record<RoomPhase, (r: LiveRoomInfo) => string> = {
  before: (r) => `Chat and cheers open ${formatZoned(r.opensAt, ICT)} Thai time.`,
  open: () => "",
  closed: () => "The room is closed. Thanks for waiting together.",
};

/** Comeback waiting room: synced countdown, S2U-color flood in the last 10 s, cheers, chat and presence. */
export function LiveRoom({ countdown, room, signedIn, fandomName, floodColor, serverNow, whenText }: LiveRoomProps) {
  const live = useLiveRoom(room?.id ?? null, { serverNow, targetAt: countdown.targetAt, signedIn, initial: { cheers: room?.cheers ?? 0, online: room?.online ?? 0 } });
  const { clock } = live;

  // "Preview the last 10 seconds": local only (never logs attendance); counts PREVIEW_SEC down from the click on the synced clock
  const [previewFrom, setPreviewFrom] = useState<number | null>(null);
  const previewLeft = useClockSelect(clock, (now) => (previewFrom === null ? -1 : Math.max(0, PREVIEW_SEC - Math.floor((now - previewFrom) / 1000))));
  const previewing = previewFrom !== null && previewLeft !== null && previewLeft >= 0;
  const left = previewing ? previewLeft : live.secLeft;

  const phase = useClockSelect(clock, (now): RoomPhase | "none" => (room ? roomPhase(now, room.opensAt, room.closesAt) : "none"));
  const roomState: RoomPhase | null = phase === null || phase === "none" ? null : phase;

  const flood = isFlood(left);
  const done = left === 0;
  const clockFmt = left === null ? null : formatClock(left);
  const sizeClass = clockFmt?.size === "lg" ? s.clockLg : clockFmt?.size === "md" ? s.clockMd : s.clockSm;
  const canCheer = signedIn && roomState === "open";

  const vars = (flood ? { "--room-flood": floodColor } : undefined) as CSSProperties | undefined;
  const label = done ? "It’s out" : flood ? "Final countdown" : "Counting down";
  const text = done
    ? "Go stream it. The room stays open a little longer."
    : flood
      ? `${fandomName} colors everywhere. Together now.`
      : `Release time ${whenText}`;

  return (
    <div className={`${s.room} ${flood ? s.flood : ""}`} style={vars}>
      <div className={s.col}>
        <div className={s.top}>
          <div className={s.topL}>
            <Link href="/fan" className={s.back}>← S2U hub</Link>
            <span className={`lbl ${s.dim}`}>Live · comeback waiting room</span>
            <h1 className={`disp ${s.h1}`}>{countdown.title} · waiting together</h1>
          </div>
          {room && (
            <div className={s.online}>
              <span className={s.liveDot} aria-hidden="true" />
              <span className={`disp ${s.onlineNum}`}>{fmt(live.online)}</span>
              <span className={s.onlineTxt}>{fandomName} in the room</span>
            </div>
          )}
        </div>

        <div className={s.grid}>
          <section className={s.stage} aria-label="Countdown">
            <span className={`lbl ${s.dim}`}>{label}</span>
            <span
              className={`disp ${s.clock} ${sizeClass} ${flood && !done ? s.pulse : ""}`}
              role="timer"
              aria-label={`Time until ${countdown.title}`}
            >
              {clockFmt ? clockFmt.text : "--:--"}
            </span>
            <p className={s.phaseText}>{text}</p>
            <div className={s.actions}>
              <button
                type="button"
                className={`${s.btn} ${s.btnP}`}
                onClick={() => setPreviewFrom(previewing ? null : clock.get())}
              >
                {previewing ? "Back to the real countdown" : "Preview the last 10 seconds"}
              </button>
              {signedIn || !room ? (
                <button type="button" className={`${s.btn} ${s.btnS}`} onClick={live.cheer} disabled={!canCheer}>
                  Light up · {fmt(live.cheers)}
                </button>
              ) : (
                <Link href="/auth/sign-in" className={`${s.btn} ${s.btnS}`}>Sign in to light up · {fmt(live.cheers)}</Link>
              )}
            </div>
            <p className={s.note}>Every screen in the room turns {fandomName} color at the same moment. The MV itself plays on YouTube.</p>
            {room && roomState && PHASE_NOTE[roomState](room) && <p className={s.note} role="status">{PHASE_NOTE[roomState](room)}</p>}
            {!room && <p className={s.note}>The waiting room isn’t open yet. The countdown still runs here.</p>}
            {live.offline && <p className={s.note} role="status">Reconnecting to the room…</p>}
          </section>

          <ChatPanel
            clock={clock}
            messages={live.messages}
            signedIn={signedIn}
            phase={roomState}
            slowModeSec={room?.slowModeSec ?? 5}
            lastSentAt={live.lastSentAt}
            canRead={live.canRead}
            send={live.sendMessage}
          />
        </div>

        <section className={s.cards} aria-label="About the room">
          <div className={s.card}>
            <span className={`lbl ${s.dim}`}>After the drop</span>
            <span className={`disp ${s.cardT}`}>Streaming mission starts</span>
            <p className={s.cardD}>Details follow the official announcement.</p>
          </div>
          <div className={s.card}>
            <span className={`lbl ${s.dim}`}>Moderation</span>
            <span className={`disp ${s.cardT}`}>Slow mode on</span>
            <p className={s.cardD}>One message every {room?.slowModeSec ?? 5}s, moderators can hide messages.</p>
          </div>
          <div className={s.card}>
            <span className={`lbl ${s.dim}`}>Memory</span>
            <span className={`disp ${s.cardT}`}>“I was here” badge</span>
            <p className={s.cardD}>Watch the countdown hit zero while signed in. Goes into your Wrapped and room.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
