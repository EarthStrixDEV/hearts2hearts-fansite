"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeartIcon } from "@/components/ui/HeartIcon";
import type { GameData } from "@/lib/db/game";
import { GameHub } from "./GameHub";
import { Leaderboard } from "./Leaderboard";
import { LoginGate, type FanUser } from "./LoginGate";
import { MemoryView } from "./MemoryView";
import { QuizView } from "./QuizView";
import { ResultView, type Reward, type SaveState } from "./ResultView";
import { addToBoard, readBoard, type LocalEntry } from "./local-board";
import { GAME_RULES, rarityFor, toPoints, type GameKind } from "./rules";

type Screen = { name: "hub" } | { name: "quiz" } | { name: "memory" } | { name: "result"; game: GameKind; raw: number; max: number; reward: Reward | null };

const QUESTION_SECONDS = 15;

export function GameCanvas({ data }: { data: GameData }) {
  const [screen, setScreen] = useState<Screen>({ name: "hub" });
  const [round, setRound] = useState(0); // remounts a view for "Play again"
  const [local, setLocal] = useState<LocalEntry[]>([]);
  const [user, setUser] = useState<FanUser | null>(null);
  const [online, setOnline] = useState(false);
  const [save, setSave] = useState<SaveState>({ status: "guest" });
  const [boardKey, setBoardKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const colors = Object.fromEntries(data.cards.map((c) => [c.name, c.color_hex]));

  useEffect(() => {
    setLocal(readBoard());
    return () => clearTimeout(toastTimer.current);
  }, []);

  // Fan session via /api/game/me. Without a database (online=false) the game still works with the local board only.
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/game/me", { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { online: boolean; user: FanUser | null }) => {
        setOnline(Boolean(j.online));
        setUser(j.user);
      })
      .catch(() => {});
    return () => ctl.abort();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const finish = useCallback(
    async (game: GameKind, raw: number, max: number) => {
      const pct = max ? raw / max : 0;
      const member = data.cards[Math.floor(Math.random() * data.cards.length)];
      const rarity = rarityFor(pct);
      const reward: Reward | null = member
        ? {
            name: member.name,
            rarity,
            grad: `linear-gradient(160deg,${member.color_hex}, #FFF8F3 120%)`,
            foil: rarity === "Holo" ? 0.7 : rarity === "Rare" ? 0.35 : 0.1,
          }
        : null; // no card rows (empty DB): no photocard reward
      const d = new Date();
      setLocal(addToBoard({ game: GAME_RULES[game].label, score: `${raw}/${max}`, pct, date: `${d.getMonth() + 1}/${d.getDate()}` }));
      setScreen({ name: "result", game, raw, max, reward });

      if (!user) return setSave({ status: "guest" });
      setSave({ status: "saving" });
      try {
        const res = await fetch("/api/game/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game, score: toPoints(game, raw) }),
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.ok) {
          setSave({ status: "saved", rank: j.rank });
          setBoardKey((k) => k + 1);
        } else {
          const msg: Record<string, string> = {
            too_fast: "That round was too quick to count. Score kept on this device.",
            login_required: "Sign in again to post scores (your session expired, or this account can’t post).",
          };
          setSave({ status: "error", message: msg[j.error] ?? "Could not post to the online board. Score kept on this device." });
        }
      } catch {
        setSave({ status: "error", message: "Could not post to the online board. Score kept on this device." });
      }
    },
    [data.cards, user],
  );

  const start = (g: "quiz" | "memory") => {
    setRound((r) => r + 1);
    setSave({ status: "guest" });
    setScreen(g === "quiz" ? { name: "quiz" } : { name: "memory" });
  };
  const quit = () => setScreen({ name: "hub" });

  const share = async () => {
    const url = window.location.href;
    const text = "I just played the Hearts2Hearts fan quiz on H2H·S2U!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "H2H·S2U", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      showToast("Link copied to clipboard");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") showToast("Could not share from this browser");
    }
  };

  const inGame = screen.name !== "hub";
  const gameName = screen.name === "quiz" ? "Quiz" : screen.name === "memory" ? "Memory Match" : screen.name === "result" ? GAME_RULES[screen.game].label : "";
  const best: Record<string, string> = {};
  for (const e of local) if (!(e.game in best)) best[e.game] = e.score;

  return (
    <>
      {toast && (
        <div role="status" className="glass gm-toast fixed left-1/2 top-20 z-[70] flex items-center gap-2 rounded-full px-[18px] py-3 text-sm font-medium text-[#2B2440] shadow-pink" style={{ background: "rgba(255,255,255,.9)" }}>
          <HeartIcon size={16} />
          {toast}
        </div>
      )}

      <section className="relative overflow-hidden px-6 pb-8 pt-16">
        <div aria-hidden="true" className="absolute inset-0">
          <span className="floaty absolute left-[9%] top-[34%]"><HeartIcon size={30} fill="#FFB6D5" /></span>
          <span className="floaty absolute right-[12%] top-[24%]" style={{ animationDelay: "-2s" }}><HeartIcon size={22} fill="#C9B6FF" /></span>
        </div>
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-2.5">
          {inGame && (
            <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
              <button type="button" className="fx cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-ink-500" onClick={quit}>Game</button>
              {" / "}
              <span className="font-semibold text-ink-900">{gameName}</span>
            </nav>
          )}
          <h1 className="disp holo-text m-0 text-[clamp(40px,5.5vw,68px)] font-bold leading-[1.05] tracking-[-0.02em]">How well do you know H2H?</h1>
          <p className="m-0 text-[17px] text-ink-500">Pick a game. Every question is built from verified facts only.</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-20 pt-2">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col items-center gap-6">
          {screen.name === "hub" && <GameHub catalog={data.catalog} best={best} onStart={start} />}
          {screen.name === "quiz" && (
            <QuizView key={round} questions={data.questions} colors={colors} seconds={QUESTION_SECONDS} onQuit={quit} onFinish={(c, t) => finish("quiz", c, t)} />
          )}
          {screen.name === "memory" && <MemoryView key={round} cards={data.cards} onQuit={quit} onFinish={(raw, pairs) => finish("memory", raw, pairs)} />}
          {screen.name === "result" && (
            <ResultView
              game={GAME_RULES[screen.game].label}
              raw={screen.raw}
              max={screen.max}
              line={screen.game === "quiz" ? "Built only from verified profile facts" : "Fewer moves, higher score"}
              reward={screen.reward}
              save={save}
              onAgain={() => start(screen.game)}
              onShare={share}
            />
          )}
        </div>
        <Leaderboard
          local={local}
          onlineEnabled={online}
          refreshKey={boardKey}
          footer={<LoginGate user={user} online={online} onSignedOut={() => { setUser(null); setSave({ status: "guest" }); }} />}
        />
      </div>
    </>
  );
}
