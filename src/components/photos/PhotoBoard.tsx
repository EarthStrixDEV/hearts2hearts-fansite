"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Photo } from "@/components/ui/Photo";
import type { PhotoEra } from "@/lib/db/photos";
import { cn } from "@/lib/utils";
import { Lightbox } from "./Lightbox";
import { BATCH, LAYOUTS, buildEra, gradOf, spanOf, type Layout, type Tile } from "./model";
import s from "./photos.module.css";

type Patch = { album?: string; layout?: Layout; seed?: number };

function PhotoButton({ tile, className, style, tag, busy, ref, onOpen }: {
  tile: Tile;
  className: string;
  style?: CSSProperties;
  tag?: string;
  busy?: boolean;
  ref?: Ref<HTMLButtonElement>;
  onOpen: () => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      className={className}
      style={{ ...style, viewTransitionName: tile.vt }}
      aria-label={`Open ${tile.era.title}: ${tile.photo.who}, ${tile.photo.event}`}
      aria-busy={busy}
      onClick={onOpen}
    >
      <span className={s.img} style={{ background: tile.grad }}>
        <Photo src={tile.photo.src} alt="" style={{ objectPosition: tile.wide ? "center" : "center 22%" }} />
      </span>
      {tag && <span className={s.tag}>{tag}</span>}
      <span className={s.cap}>
        <span>{tile.photo.who}</span>
        <span className={s.num}>{tile.n}</span>
      </span>
    </button>
  );
}

/** Endless-feed tile: a shimmer placeholder until it scrolls into view, then a blur-up reveal. */
function FeedTile({ tile, j, seed, onOpen }: { tile: Tile; j: number; seed: number; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => setShown(true), 180 + Math.random() * 520);
      },
      { rootMargin: "0px 0px 80px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [shown]);

  return (
    <PhotoButton
      ref={ref}
      tile={tile}
      tag={tile.era.title}
      busy={!shown}
      className={cn(s.ph, s.lz, s[`s${spanOf(tile, j + seed)}`], shown ? s.show : s.wait)}
      style={{ "--d": `${(j % BATCH) * 40}ms` } as CSSProperties}
      onOpen={onOpen}
    />
  );
}

export function PhotoBoard({ eras }: { eras: PhotoEra[] }) {
  const [album, setAlbum] = useState("all");
  const [layout, setLayout] = useState<Layout>("mosaic");
  const [seed, setSeed] = useState(0);
  const [gen, setGen] = useState(0);
  const [vt, setVt] = useState(false);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lb, setLb] = useState<{ id: string; i: number } | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadTimer = useRef<number | undefined>(undefined);

  const all = eras.map((e, k) => ({ era: e, tiles: buildEra(e, k, seed) }));
  const shown = all.filter((x) => album === "all" || x.era.id === album);
  const total = shown.reduce((t, x) => t + x.tiles.length, 0);
  const sel = eras.find((e) => e.id === album);
  const endless = layout === "endless";
  const feedAll = shown.flatMap((x) => x.tiles);
  const feed = feedAll.slice(0, pages * BATCH);
  const canMore = feed.length < feedAll.length;
  const lbEra = lb && all.find((x) => x.era.id === lb.id);
  // Pop-in replays on every change; once the browser morphs layouts itself (view transitions) it is not needed.
  const pop = vt ? undefined : gen % 2 ? s.inA : s.inB;

  /** Applies a filter/layout/shuffle change, morphing the photos into place when the browser can. */
  const go = (patch: Patch) => {
    const apply = () => {
      if (patch.album !== undefined) setAlbum(patch.album);
      if (patch.layout) setLayout(patch.layout);
      if (patch.seed !== undefined) setSeed(patch.seed);
      // The feed starts over from its first page when it opens or its filter changes.
      if ((patch.layout ?? layout) === "endless" && (layout !== "endless" || patch.album !== undefined)) {
        clearTimeout(loadTimer.current);
        setLoading(false);
        setPages(1);
      }
      setGen((g) => g + 1);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !document.startViewTransition) return apply();
    document.startViewTransition(() =>
      flushSync(() => {
        setVt(true);
        apply();
      }),
    );
  };

  const more = () => {
    if (loading || !canMore) return;
    setLoading(true);
    loadTimer.current = window.setTimeout(() => {
      setPages((p) => p + 1);
      setLoading(false);
    }, 750);
  };

  useEffect(() => () => clearTimeout(loadTimer.current), []);

  // Load the next page when the end of the feed scrolls near the viewport.
  useEffect(() => {
    const el = sentinel.current;
    if (!endless || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([en]) => en.isIntersecting && more(), { rootMargin: "0px 0px 240px 0px" });
    io.observe(el);
    return () => io.disconnect();
  });

  return (
    <div className={s.page}>
      <div aria-hidden="true" className={s.wash}>
        <div className={s.washColor} style={{ background: sel ? gradOf(sel.colors, 0) : "var(--holo)" }} />
        <div className={s.washFade} />
      </div>
      <div className={s.content}>
        <main className={s.main}>
          <div className={s.head}>
            <h1 className={cn("disp holo-text", s.title)}>Photos</h1>
            <p className={s.lead}>Official stills and event photos, grouped by era. Pick a layout, shuffle the mosaic, or open any photo full screen.</p>
            <span className={cn("chip", s.note)}>Linked from their sources · credit and licence in the viewer</span>
          </div>

          <div className={cn("glass", s.bar)}>
            <div role="group" aria-label="Filter by era" className={s.eras}>
              <button type="button" className={cn(s.ach, album === "all" && s.on)} aria-pressed={album === "all"} onClick={() => go({ album: "all" })}>
                All eras
              </button>
              {eras.map((e) => (
                <button key={e.id} type="button" className={cn(s.ach, album === e.id && s.on)} aria-pressed={album === e.id} onClick={() => go({ album: e.id })}>
                  <span className={s.dot} style={{ background: e.colors[1] }} />
                  {e.title}
                </button>
              ))}
            </div>
            <div className={s.tools}>
              <div role="group" aria-label="Layout" className={s.layWrap}>
                {LAYOUTS.map((l) => (
                  <button key={l.id} type="button" className={cn(s.lay, layout === l.id && s.on)} aria-pressed={layout === l.id} aria-label={`${l.label} layout`} title={l.label} onClick={() => go({ layout: l.id })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                      <path d={l.icon} />
                    </svg>
                  </button>
                ))}
              </div>
              <IconButton label="Shuffle photos" title="Shuffle" onClick={() => go({ seed: seed + 1 + Math.floor(Math.random() * 5) })}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 4h4v4M4 20L20 4M20 16v4h-4M15 15l5 5M4 4l5 5" />
                </svg>
              </IconButton>
            </div>
          </div>
          <p aria-live="polite" className={s.status}>
            {total} photos · {shown.length} eras · {LAYOUTS.find((l) => l.id === layout)?.label}
          </p>

          {!endless &&
            shown.map(({ era, tiles }) => (
              <section key={era.id} aria-labelledby={`h-${era.id}`} className={s.section}>
                <div className={s.secHead}>
                  <div className={s.secTitle}>
                    <span aria-hidden="true" className={s.swatch} style={{ background: gradOf(era.colors, 0) }} />
                    <span className={s.secText}>
                      <span className={s.secMeta}>
                        {era.kind} · {era.date}
                      </span>
                      <h2 id={`h-${era.id}`} className={cn("disp", s.secName)}>
                        {era.title}
                      </h2>
                    </span>
                  </div>
                  <span className={s.secSide}>
                    {tiles.length} photos
                    <Link href="/music" className={cn("btn btn-s", s.listen)}>
                      Listen
                    </Link>
                  </span>
                </div>
                <div className={s[layout]}>
                  {tiles.map((t) => (
                    <PhotoButton
                      key={t.vt}
                      tile={t}
                      className={cn(s.ph, s[`s${spanOf(t, t.i + seed)}`], pop)}
                      style={{ "--r": t.rot, "--d": t.delay, "--ar": t.ar } as CSSProperties}
                      onOpen={() => setLb({ id: era.id, i: t.i })}
                    />
                  ))}
                </div>
              </section>
            ))}

          {endless && (
            <section aria-label="All photos, newest first" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className={cn(s.mosaic, s.endless)}>
                {feed.map((t, j) => (
                  <FeedTile key={t.vt} tile={t} j={j} seed={seed} onOpen={() => setLb({ id: t.era.id, i: t.i })} />
                ))}
              </div>
              <div ref={sentinel} className={s.sentinel}>
                {loading && (
                  <div role="status" className={s.loadingMsg}>
                    <span className={s.bounce} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    Loading more photos…
                  </div>
                )}
                {canMore && !loading && (
                  <>
                    <Button variant="secondary" onClick={more}>
                      Load more
                    </Button>
                    <span className={s.count}>
                      Showing {feed.length} of {feedAll.length}
                    </span>
                  </>
                )}
                {!canMore && (
                  <div className={s.endcard}>
                    <span className={cn("disp", s.endTitle)}>That’s every photo so far</span>
                    <span className={s.endText}>{feedAll.length} photos. New ones show up here after each release.</span>
                    <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                      Back to top
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
      {lb && lbEra && <Lightbox tiles={lbEra.tiles} index={lb.i} onIndex={(i) => setLb({ id: lb.id, i })} onClose={() => setLb(null)} />}
    </div>
  );
}
