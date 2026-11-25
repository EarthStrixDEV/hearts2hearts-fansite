"use client";

import { useSyncExternalStore } from "react";
import { refineOffset, type OffsetSample } from "@/lib/fan/live";

/** Until a poll answers, the page's `serverNow` is trusted to within this much (render-to-mount, unknown latency). */
const INITIAL_UNCERTAINTY_MS = 5_000;
const TICK_MS = 250;

export interface RoomClock {
  subscribe: (cb: () => void) => () => void;
  /** Server-synced time in ms, 0 until the first subscriber (so server and client markup match). */
  get: () => number;
  /** Feeds a poll response: refines the offset when this round trip beat the best so far. */
  sample: (serverNow: number, sentAt: number, receivedAt: number) => void;
}

/**
 * Server-synced clock for the waiting room. Starts from the page's `serverNow` and refines the offset from poll responses
 * (smallest round trip wins), unlike the hub's useServerNow which assumes ~0 s between render and mount.
 */
export function createRoomClock(pageServerNow: number): RoomClock {
  const st = { value: 0, best: null as OffsetSample | null, timer: undefined as ReturnType<typeof setInterval> | undefined };
  const subs = new Set<() => void>();
  const refresh = () => {
    st.value = Date.now() + (st.best?.offset ?? 0);
    subs.forEach((s) => s());
  };
  const ensure = () => {
    st.best ??= { offset: pageServerNow - Date.now(), rtt: INITIAL_UNCERTAINTY_MS };
  };
  return {
    subscribe(cb) {
      subs.add(cb);
      if (st.timer === undefined) {
        ensure();
        st.value = Date.now() + (st.best?.offset ?? 0);
        st.timer = setInterval(refresh, TICK_MS);
      }
      return () => {
        subs.delete(cb);
        if (!subs.size && st.timer !== undefined) {
          clearInterval(st.timer);
          st.timer = undefined;
        }
      };
    },
    get: () => st.value,
    sample(serverNow, sentAt, receivedAt) {
      ensure();
      st.best = refineOffset(st.best, serverNow, sentAt, receivedAt);
      if (st.timer !== undefined) refresh();
    },
  };
}

/**
 * Subscribes to a derived value of the clock. The selector must return a primitive: the component re-renders only when it
 * changes (e.g. seconds left), not on every tick. Null before mount.
 */
export function useClockSelect<T extends string | number | boolean>(clock: RoomClock, select: (nowMs: number) => T): T | null {
  return useSyncExternalStore(
    clock.subscribe,
    () => { const v = clock.get(); return v === 0 ? null : select(v); },
    () => null,
  );
}
