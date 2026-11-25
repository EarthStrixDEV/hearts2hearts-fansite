"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HEARTBEAT_MS, mergeMessages, pollDelayMs, secondsLeft, type FeedMessage, type FeedResponse } from "@/lib/fan/live";
import { getAnonId } from "./anon";
import { createRoomClock, useClockSelect, type RoomClock } from "./roomClock";

export type SendResult = { ok: true } | { ok: false; reason: "slow_mode" | "closed" | "not_allowed" | "sign_in" | "network" };

export interface LiveRoomOptions {
  /** Server time (ms) when the page rendered. */
  serverNow: number;
  /** ISO instant the countdown ends. */
  targetAt: string;
  signedIn: boolean;
  /** Counts from the server render, shown until the first poll answers. */
  initial: { cheers: number; online: number };
}

export interface LiveRoomApi {
  clock: RoomClock;
  /** Whole seconds to the real target on the synced clock; null before mount. */
  secLeft: number | null;
  messages: FeedMessage[];
  cheers: number;
  online: number;
  /** false for guests (RLS hides chat) and until the first poll answers */
  canRead: boolean;
  /** true while polls are failing */
  offline: boolean;
  /** Server-synced time of the last message this client sent (drives the slow-mode cooldown). */
  lastSentAt: number | null;
  sendMessage: (body: string) => Promise<SendResult>;
  cheer: () => void;
}

const post = (url: string, body: unknown = {}) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });

/**
 * The waiting room's live state behind one hook: short polling for chat / cheers / online count, a presence heartbeat,
 * a server-synced clock and the attendance call at t = 0. A realtime transport can replace the two loops below without
 * changing what the UI reads. `roomId` null = the countdown has no room yet (clock only).
 */
export function useLiveRoom(roomId: string | null, o: LiveRoomOptions): LiveRoomApi {
  const clock = useMemo(() => createRoomClock(o.serverNow), [o.serverNow]);
  const target = Date.parse(o.targetAt);
  const secLeft = useClockSelect(clock, (now) => secondsLeft(target, now));

  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [serverCheers, setServerCheers] = useState(o.initial.cheers);
  const [inflight, setInflight] = useState(0);
  const [online, setOnline] = useState(o.initial.online);
  const [canRead, setCanRead] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  // Poll loop: 2 s while the tab is visible, 10 s hidden, backing off while requests fail.
  useEffect(() => {
    if (!roomId) return;
    const st = { stopped: false, after: 0, failures: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined };
    const poll = async () => {
      clearTimeout(st.timer);
      const sentAt = Date.now();
      try {
        const res = await fetch(`/api/fan/live/${roomId}/feed${st.after > 0 ? `?after=${st.after}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`feed ${res.status}`);
        const feed = (await res.json()) as FeedResponse;
        if (st.stopped) return;
        clock.sample(feed.serverNow, sentAt, Date.now());
        st.failures = 0;
        for (const m of feed.messages) st.after = Math.max(st.after, m.id);
        setMessages((prev) => mergeMessages(prev, feed.messages));
        setServerCheers((c) => Math.max(c, feed.cheers));
        setOnline(feed.online);
        setCanRead(feed.canRead);
        setOffline(false);
      } catch {
        if (st.stopped) return;
        st.failures += 1;
        setOffline(true);
      }
      if (!st.stopped) st.timer = setTimeout(poll, pollDelayMs(!document.hidden, st.failures));
    };
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    void poll();
    return () => {
      st.stopped = true;
      clearTimeout(st.timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomId, clock]);

  // Presence heartbeat every 20 s (signed in: by user id; guests: anonymous id from localStorage).
  useEffect(() => {
    if (!roomId) return;
    const anonId = o.signedIn ? undefined : getAnonId();
    let stopped = false;
    const beat = async () => {
      try {
        const res = await post(`/api/fan/live/${roomId}/heartbeat`, anonId ? { anonId } : {});
        if (res.ok && !stopped) setOnline(((await res.json()) as { online: number }).online);
      } catch { /* the next beat retries */ }
    };
    void beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => { stopped = true; clearInterval(t); };
  }, [roomId, o.signedIn]);

  // "I was here": once, when this client watched the countdown reach zero (arriving afterwards does not count).
  const saw = useRef({ pending: false, fired: false });
  useEffect(() => {
    if (secLeft === null || !roomId || !o.signedIn) return;
    if (secLeft > 0) { saw.current.pending = true; return; }
    if (!saw.current.pending || saw.current.fired) return;
    saw.current.fired = true;
    void post(`/api/fan/live/${roomId}/attend`).catch(() => { saw.current.fired = false; });
  }, [secLeft, roomId, o.signedIn]);

  const sendMessage = useCallback(async (body: string): Promise<SendResult> => {
    if (!roomId) return { ok: false, reason: "closed" };
    try {
      const res = await post(`/api/fan/live/${roomId}/messages`, { body });
      if (res.ok) {
        const { message } = (await res.json()) as { message: FeedMessage };
        setMessages((prev) => mergeMessages(prev, [message]));
        setLastSentAt(clock.get());
        return { ok: true };
      }
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      if (error === "slow_mode") setLastSentAt(clock.get());
      if (error === "slow_mode" || error === "closed" || error === "not_allowed" || error === "sign_in") return { ok: false, reason: error };
      return { ok: false, reason: "network" };
    } catch {
      return { ok: false, reason: "network" };
    }
  }, [roomId, clock]);

  const cheer = useCallback(() => {
    if (!roomId) return;
    setInflight((n) => n + 1);
    post(`/api/fan/live/${roomId}/cheer`)
      .then(async (res) => { if (res.ok) { const { cheers } = (await res.json()) as { cheers: number }; setServerCheers((c) => Math.max(c, cheers)); } })
      .catch(() => { /* a lost cheer is not worth an error */ })
      .finally(() => setInflight((n) => n - 1));
  }, [roomId]);

  return { clock, secLeft, messages, cheers: serverCheers + inflight, online, canRead, offline, lastSentAt, sendMessage, cheer };
}
