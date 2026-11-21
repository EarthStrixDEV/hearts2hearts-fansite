"use client";

import type { ReactNode } from "react";
import { PLAY_EVENT } from "./MusicWidget";

/** Hero CTA: scrolls to the music widget and tells it to start playing. */
export function ListenNow({ children }: { children: ReactNode }) {
  return (
    <a className="btn btn-p" href="#music" onClick={() => window.dispatchEvent(new Event(PLAY_EVENT))}>
      {children}
    </a>
  );
}
