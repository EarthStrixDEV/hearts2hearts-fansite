"use client";

import { useMemo, useSyncExternalStore } from "react";

interface Clock {
  subscribe: (cb: () => void) => () => void;
  get: () => number;
}

/** External clock store: `serverNow` plus the browser time elapsed since the first subscriber, ticking every second. */
function createClock(serverNow: number): Clock {
  const st = { value: 0, skew: 0, timer: undefined as ReturnType<typeof setInterval> | undefined };
  const subs = new Set<() => void>();
  return {
    subscribe(cb) {
      subs.add(cb);
      if (st.timer === undefined) {
        st.skew = serverNow - Date.now();
        st.value = Date.now() + st.skew;
        st.timer = setInterval(() => {
          st.value = Date.now() + st.skew;
          subs.forEach((s) => s());
        }, 1000);
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
  };
}

/**
 * Server-synced clock: `serverNow` (the server's time when the page rendered) advanced by this browser's elapsed time.
 * Null until mounted, so server and client markup match. Assumes render-to-mount takes ~0s; the waiting room refines the
 * offset from its poll responses. useSyncExternalStore keeps setState out of effects.
 */
export function useServerNow(serverNow: number): number | null {
  const clock = useMemo(() => createClock(serverNow), [serverNow]);
  const v = useSyncExternalStore(clock.subscribe, clock.get, () => 0);
  return v === 0 ? null : v;
}
