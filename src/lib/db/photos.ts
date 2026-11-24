import { SEED_PHOTO_ERAS } from "./seed/photos";

export interface PhotoCredit {
  /** Author or rights holder, as it must be shown next to the photo. */
  by: string;
  license: string;
  /** Licence text, or null for all-rights-reserved official material. */
  licenseUrl: string | null;
  /** Page the photo comes from (Commons file page, YouTube Short). */
  sourceUrl: string;
}

export interface EraPhoto {
  /** Member's stage name, or "Group". */
  who: string;
  /** Where it was taken, e.g. "K-World Dream Awards". */
  event: string;
  /** Hotlinked image URL (nothing is copied into the repo or the bucket). */
  src: string;
  /** Pixel size of the source: the viewer and the masonry layout keep this aspect ratio. */
  w: number;
  h: number;
  alt: string;
  credit: PhotoCredit;
}

export interface PhotoEra {
  id: string;
  title: string;
  /** Release type, e.g. "2nd mini album". */
  kind: string;
  /** Month and year of the release, e.g. "Jun 2026". */
  date: string;
  /** Three tints of the era's gradient: the swatch, the page wash and the placeholder behind a loading photo. */
  colors: readonly [string, string, string];
  photos: EraPhoto[];
}

/**
 * Photos grouped by era, newest era first. There is no photos table yet (see docs/schema-from-spec.sql), so this returns the
 * sourced seed: freely licensed Commons photos plus the official YouTube Short stills already tracked in db/data/photocards.json.
 * Swap the body for a published-only query behind `unstable_cache` (tag `photos`) once a table exists.
 */
export async function getPhotoEras(): Promise<PhotoEra[]> {
  return SEED_PHOTO_ERAS;
}
