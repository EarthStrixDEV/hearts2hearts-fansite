"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Photo } from "@/components/ui/Photo";
import { xImageSize } from "@/lib/media-url";
import styles from "./member-detail.module.css";

// Tile heights only vary the masonry rhythm. Without photos every tile is a colour placeholder; with photos each tile is one image.
const HEIGHTS = [320, 220, 280, 360, 240, 300, 200, 340];
const bg = (color: string, k: number) => `linear-gradient(${140 + k * 25}deg,${color}, #FFF8F3 ${90 + k * 8}%)`;

const ARROW = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
);
const lbBtn = { background: "rgba(255,255,255,.14)", border: 0, color: "#fff" } as const;

export function MemberGallery({ color, images = [] }: { color: string; images?: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const hasPhotos = images.length > 0;
  const n = hasPhotos ? images.length : HEIGHTS.length;

  const show = (k: number) => { setOpen((k + n) % n); setZoom(false); };
  const close = () => { setOpen(null); opener.current?.focus(); };

  useEffect(() => { if (open !== null && !dialog.current?.contains(document.activeElement)) dialog.current?.focus(); }, [open]);

  return (
    <>
      <div className={styles.masonry}>
        {Array.from({ length: n }, (_, k) => HEIGHTS[k % HEIGHTS.length]).map((h, k) => (
          <button
            key={k}
            type="button"
            className={styles.gtile}
            aria-label={`Open photo ${k + 1}`}
            style={{ height: hasPhotos ? undefined : h, aspectRatio: hasPhotos ? "4 / 5" : undefined, background: bg(color, k) }}
            onClick={(e) => { opener.current = e.currentTarget; show(k); }}
          >
            {hasPhotos ? <Photo src={xImageSize(images[k], "small")} /> : <Chip bg="rgba(255,255,255,.85)" color="#2B2440" style={{ position: "absolute", left: 10, bottom: 10 }}>TODO · photo {k + 1}</Chip>}
          </button>
        ))}
      </div>

      {open !== null && (
        <div className={styles.ov} onClick={close}>
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${open + 1} of ${n}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") show(open - 1);
              else if (e.key === "ArrowRight") show(open + 1);
              else if (e.key === "Escape") close();
            }}
            className="relative flex w-full max-w-[980px] flex-col items-center gap-4 outline-none"
          >
            <div
              className={styles.lbImg}
              onClick={() => setZoom((z) => !z)}
              style={{ width: "min(100%, 640px)", aspectRatio: "4 / 5", maxHeight: "72vh", borderRadius: 20, background: bg(color, open), transform: `scale(${zoom ? 1.5 : 1})`, cursor: zoom ? "zoom-out" : "zoom-in", display: "flex", alignItems: "flex-end", padding: 16, boxSizing: "border-box", position: "relative", overflow: "hidden" }}
            >
              {hasPhotos ? <Photo src={xImageSize(images[open], "large")} style={{ objectFit: "contain" }} /> : <Chip bg="rgba(255,255,255,.88)" color="#2B2440">TODO · photo {open + 1}</Chip>}
            </div>
            <div className="flex items-center gap-4 text-white">
              <button type="button" className="ibtn" aria-label="Previous photo" style={lbBtn} onClick={() => show(open - 1)}>{ARROW("M15 5l-7 7 7 7")}</button>
              <span className="text-sm tabular-nums">{open + 1} / {n}</span>
              <button type="button" className="ibtn" aria-label="Next photo" style={lbBtn} onClick={() => show(open + 1)}>{ARROW("M9 5l7 7-7 7")}</button>
            </div>
            <button type="button" className="ibtn absolute right-0 top-0" aria-label="Close" style={lbBtn} onClick={close}>{ARROW("M6 6l12 12M18 6L6 18")}</button>
          </div>
        </div>
      )}
    </>
  );
}
