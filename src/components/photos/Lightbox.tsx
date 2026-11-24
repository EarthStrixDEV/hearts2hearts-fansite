"use client";

import { useEffect, useRef } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/utils";
import type { Tile } from "./model";
import s from "./photos.module.css";

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", "aria-hidden": true } as const;

/** Full-screen viewer over one era's photos. Closes on Esc, steps on ←/→, and gives focus back to the tile that opened it. */
export function Lightbox({ tiles, index, onIndex, onClose }: { tiles: Tile[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tile = tiles[index];
  const { credit } = tile.photo;
  const step = (d: number) => onIndex((index + d + tiles.length) % tiles.length);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    rootRef.current?.querySelector("button")?.focus(); // the close button is the first control
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div ref={rootRef} className={s.lbx} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className={s.lbHead}>
        <span className={s.lbTitle}>
          <span className={cn("disp", s.lbt)}>{tile.era.title}</span>
          <span className={s.lbSub}>
            {tile.photo.who} · {tile.photo.event} · {index + 1} / {tiles.length}
          </span>
        </span>
        <IconButton label="Close viewer" className={s.lbbtn} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...stroke}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </IconButton>
      </div>
      <div className={s.lbBody}>
        <IconButton label="Previous photo" className={s.lbbtn} onClick={() => step(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.4" {...stroke}>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </IconButton>
        <figure className={s.lbFig}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={tile.vt}
            className={s.lbimg}
            src={tile.photo.src}
            alt={tile.photo.alt}
            width={tile.photo.w}
            height={tile.photo.h}
            decoding="async"
            referrerPolicy="no-referrer"
            style={{ background: tile.grad }}
          />
          <figcaption className={s.lbcap}>
            {credit.by} ·{" "}
            {credit.licenseUrl ? (
              <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">
                {credit.license}
              </a>
            ) : (
              credit.license
            )}{" "}
            ·{" "}
            <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </figcaption>
        </figure>
        <IconButton label="Next photo" className={s.lbbtn} onClick={() => step(1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.4" {...stroke}>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </IconButton>
      </div>
      <div role="group" aria-label="Photos in this era" className={s.thumbs}>
        {tiles.map((t) => (
          <button
            key={t.vt}
            type="button"
            className={cn(s.thumb, t.i === index && s.on)}
            style={{ background: t.grad }}
            aria-label={`${t.photo.who}, ${t.photo.event}`}
            aria-pressed={t.i === index}
            onClick={() => onIndex(t.i)}
          >
            <Photo src={t.photo.src} alt="" style={{ objectPosition: t.wide ? "center" : "center 22%" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
