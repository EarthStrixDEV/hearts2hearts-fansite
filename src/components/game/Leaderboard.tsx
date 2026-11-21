"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/db/game";
import type { LocalEntry } from "./local-board";

type Tab = "device" | "online";
type OnlineState = { status: "loading" } | { status: "error" } | { status: "ok"; rows: LeaderboardRow[] };

export function Leaderboard({ local, onlineEnabled, refreshKey, footer }: { local: LocalEntry[]; onlineEnabled: boolean; refreshKey: number; footer?: ReactNode }) {
  const [tab, setTab] = useState<Tab>("device");
  const [online, setOnline] = useState<OnlineState>({ status: "loading" });

  useEffect(() => {
    if (!onlineEnabled) return;
    const ctl = new AbortController();
    fetch("/api/game/score", { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { rows: LeaderboardRow[] }) => setOnline({ status: "ok", rows: j.rows }))
      .catch((e) => {
        if (e?.name !== "AbortError") setOnline({ status: "error" });
      });
    return () => ctl.abort();
  }, [onlineEnabled, refreshKey]);

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      aria-pressed={tab === t}
      onClick={() => setTab(t)}
      className={cn("gm-tab chip", tab === t ? "text-ink-900" : "text-ink-500")}
      style={{ background: tab === t ? "rgba(255,143,184,.28)" : "var(--line)" }}
    >
      {label}
    </button>
  );

  const empty = (text: string) => (
    <div className="rounded-tile border-[1.5px] border-dashed border-line p-5 text-center text-sm text-ink-500">{text}</div>
  );

  return (
    <aside aria-label="Leaderboard" className="glass flex max-w-[360px] flex-[1_1_280px] flex-col gap-3 rounded-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="disp text-xl font-semibold">Leaderboard</span>
        <span className="flex gap-1.5">
          {tabBtn("device", "This device")}
          {onlineEnabled && tabBtn("online", "Online")}
        </span>
      </div>

      {tab === "device" &&
        (local.length === 0 ? (
          empty("No scores yet. Play a round to get on the board.")
        ) : (
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {local.map((b, i) => (
              <li key={i} className="grid min-h-10 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] px-2.5" style={{ background: i === 0 ? "rgba(255,143,184,.18)" : "transparent" }}>
                <span className="disp font-semibold text-ink-500">{i + 1}</span>
                <span className="truncate text-sm">{b.game} · {b.date}</span>
                <span className="disp font-semibold">{b.score}</span>
              </li>
            ))}
          </ol>
        ))}

      {tab === "online" &&
        (online.status === "loading" ? (
          <div className="shimmer h-[120px] rounded-tile" role="status" aria-label="Loading leaderboard" />
        ) : online.status === "error" ? (
          empty("Could not load the online board right now.")
        ) : online.rows.length === 0 ? (
          empty("No online scores yet. Be the first!")
        ) : (
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {online.rows.map((r) => (
              <li key={r.rank} className="grid min-h-10 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] px-2.5" style={{ background: r.rank === 1 ? "rgba(255,143,184,.18)" : "transparent" }}>
                <span className="disp font-semibold text-ink-500">{r.rank}</span>
                <span className="truncate text-sm">{r.name}</span>
                <span className="disp font-semibold">{r.score}</span>
              </li>
            ))}
          </ol>
        ))}

      <span className="text-xs text-ink-500">
        {tab === "device" ? "Top 10 saved in your browser." : "Best round per fan this season, out of 1000."}
      </span>
      {footer}
    </aside>
  );
}
