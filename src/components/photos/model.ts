import type { EraPhoto, PhotoEra } from "@/lib/db/photos";

export type Layout = "mosaic" | "masonry" | "grid" | "collage" | "endless";

export const LAYOUTS: { id: Layout; label: string; icon: string }[] = [
  { id: "mosaic", label: "Mosaic", icon: "M3 3h10v10H3zM15 3h6v6h-6zM15 11h6v10h-6zM3 15h10v6H3z" },
  { id: "masonry", label: "Masonry", icon: "M3 3h5v11H3zM10 3h5v6h-5zM17 3h4v14h-4zM3 16h5v5H3zM10 11h5v10h-5z" },
  { id: "grid", label: "Grid", icon: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" },
  { id: "collage", label: "Collage", icon: "M3.5 6.5l8-2 2 8-8 2zM11 12.5l8.5 1-1 8-8.5-1z" },
  { id: "endless", label: "Endless", icon: "M3 3h8v7H3zM13 3h8v4h-8zM13 9h8v6h-8zM3 12h8v3H3zM8 19l4 2.5 4-2.5" },
];

/** Photos revealed per page of the endless feed. */
export const BATCH = 12;

/**
 * Mosaic tile sizes (s1 3x3 … s6 1x1), cycled per photo. Wide photos get wide tiles and tall photos get tall ones,
 * so a crop never cuts a face off.
 */
const WIDE_SPANS = [2, 5];
const TALL_SPANS = [1, 4, 3, 4, 3, 4];
const ROT = [-4, 3, -2, 5, -3, 2, -5, 4, -1];

/** Gradient shown behind a photo while it loads, and for the era swatch. */
export const gradOf = (c: readonly string[], i: number) =>
  `linear-gradient(${115 + ((i * 37) % 120)}deg,${c[i % 3]},${c[(i + 1) % 3]} 55%,${c[(i + 2) % 3]})`;

export interface Tile {
  era: PhotoEra;
  photo: EraPhoto;
  /** Index inside its era. */
  i: number;
  /** Two-digit label, "01". */
  n: string;
  grad: string;
  /** CSS aspect-ratio of the photo (masonry and the viewer). */
  ar: string;
  wide: boolean;
  rot: string;
  delay: string;
  /** view-transition-name: stable per photo so layouts morph into each other. */
  vt: string;
}

/** Mosaic span for the `n`-th tile of a run (an era in the mosaic, the whole feed in endless). */
export const spanOf = (t: Tile, n: number) => (t.wide ? WIDE_SPANS[n % WIDE_SPANS.length] : TALL_SPANS[n % TALL_SPANS.length]);

/** Deterministic order of `n` photos for a shuffle seed (0 = the natural order). Same seed, same order, so renders stay pure. */
function orderOf(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let a = seed * 0x9e3779b9;
  for (let i = n - 1; i > 0 && seed; i--) {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    const j = ((a ^ (a >>> 14)) >>> 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Lays out one era's photos. `k` is the era's position in the full list and `seed` the shuffle counter.
 * `i` is the tile's position (what the viewer steps through); its label and `vt` follow the photo, so a shuffle morphs it into place.
 */
export function buildEra(era: PhotoEra, k: number, seed: number): Tile[] {
  return orderOf(era.photos.length, seed ? seed + k * 101 : 0).map((src, i) => {
    const photo = era.photos[src];
    return {
      era,
      photo,
      i,
      n: String(src + 1).padStart(2, "0"),
      grad: gradOf(era.colors, src + seed),
      ar: `${photo.w} / ${photo.h}`,
      wide: photo.w > photo.h,
      rot: `${ROT[(i + k + seed) % ROT.length]}deg`,
      delay: `${Math.min(i * 45, 400)}ms`,
      vt: `hp-${era.id}-${src}`,
    };
  });
}
