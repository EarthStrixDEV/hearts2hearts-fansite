import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import { youtubeId } from "@/components/music/embed";
import { resolveMediaUrls } from "./media";
import type { Album, Track } from "./types";
import { G, SEED_MUSIC } from "./seed/music";

export type ReleaseTab = "albums" | "singles" | "ost" | "special";

export interface MusicRelease {
  slug: string;
  title: string;
  kind: string;
  tab: ReleaseTab;
  /** `YYYY-MM-DD`, or just `YYYY` when the exact date is not announced (seed only). */
  release_date: string | null;
  grad: string;
  /** Cover image URL (bucket or X CDN), or null/undefined → the gradient. */
  cover?: string | null;
  track_label: string;
  spotify_url: string | null;
  /** YouTube Music album page (music.youtube.com/playlist?list=OLAK…), when linked. */
  ytmusic_url?: string | null;
}
export interface MusicTrack {
  title: string; album: string; grad: string; cover?: string | null; spotify_url: string | null; youtube_url: string | null;
  /** YouTube Music album playlist (OLAK...) and this track's 0-based position in it: the in-page player plays from there. */
  ytm?: string | null;
  ytmIndex?: number;
}
export interface MusicVideo { title: string; date: string; grad: string; youtube_url: string | null; /** 11-char YouTube id (thumbnail + embed). */ id?: string | null }
export interface MusicEra { title: string; date: string; grad: string; dot: string }
export interface MusicBoardData {
  /** Newest first. */
  releases: MusicRelease[];
  /** Player queue; the first entries double as "Popular tracks" (title tracks first). */
  tracks: MusicTrack[];
  videos: MusicVideo[];
  /** Oldest first. */
  eras: MusicEra[];
}

const GRADS = Object.values(G);
const DOTS = ["#FF8FB8", "#7EC4FF", "#B9A3F5", "#FF9EC3", "#FFD25E"];
const gradFor = (key: string) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
};
const monYear = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * One entry per distinct YouTube video, newest first. A video that sits on several releases (a single and the album that
 * includes it) is dated by its earliest release.
 */
function mvGrid(albums: AlbumRow[], byAlbum: Map<string, TrackRow[]>, gradFor: (k: string) => string): MusicVideo[] {
  const out = new Map<string, MusicVideo>();
  for (const a of [...albums].reverse()) {
    for (const tr of byAlbum.get(a.id) ?? []) {
      const id = youtubeId(tr.youtube_url);
      if (!id || out.has(id)) continue;
      out.set(id, { id, title: tr.title, date: a.release_date ? monYear(a.release_date) : "", grad: gradFor(a.slug), youtube_url: tr.youtube_url });
    }
  }
  return [...out.values()].reverse();
}

const ytmId = (url: string | null): string | null => {
  try {
    const id = url ? new URL(url).searchParams.get("list") : null;
    return id && id.startsWith("OLAK") ? id : null;
  } catch {
    return null;
  }
};

const KIND: Record<Album["album_type"], string> = { single: "Single", ep: "EP", album: "Album" };

type AlbumRow = Pick<Album, "id" | "slug" | "title" | "album_type" | "release_date" | "spotify_url" | "cover_id"> & { ytmusic_url: string | null };
type TrackRow = Pick<Track, "album_id" | "title" | "is_title_track" | "spotify_url" | "youtube_url">;

const loadBoard = unstable_cache(
  async (): Promise<MusicBoardData> => {
    // No RLS: the published filter lives here. release_date::text keeps the date as YYYY-MM-DD (pg would return a Date).
    const albums = await query<{ [K in keyof AlbumRow]: AlbumRow[K] }>(
      `select id, slug, title, album_type, release_date::text as release_date, spotify_url, cover_id, ytmusic_url
         from albums
        where status = 'published'
        order by release_date desc nulls last, created_at desc`,
    );
    const trackRows = await query<{ [K in keyof TrackRow]: TrackRow[K] }>(
      `select album_id, title, is_title_track, spotify_url, youtube_url
         from tracks
        where album_id = any($1::uuid[])
        order by track_no`,
      [albums.map((a) => a.id)],
    );
    const covers = await resolveMediaUrls(albums.map((a) => a.cover_id));
    const tracksByAlbum = new Map<string, TrackRow[]>();
    for (const tr of trackRows) tracksByAlbum.set(tr.album_id, [...(tracksByAlbum.get(tr.album_id) ?? []), tr]);

    const releases: MusicRelease[] = [];
    const queue: (MusicTrack & { title_track: boolean })[] = [];
    albums.forEach((a) => {
      const own = tracksByAlbum.get(a.id) ?? [];
      const grad = gradFor(a.slug);
      releases.push({
        slug: a.slug,
        title: a.title,
        kind: KIND[a.album_type],
        tab: a.album_type === "single" ? "singles" : "albums",
        release_date: a.release_date,
        grad,
        cover: (a.cover_id && covers.get(a.cover_id)) || null,
        track_label: own.length ? `${own.length} track${own.length === 1 ? "" : "s"}` : "tracks TBA",
        spotify_url: a.spotify_url,
        ytmusic_url: a.ytmusic_url,
      });
      own.forEach((tr, k) => queue.push({ title: tr.title, album: a.title, grad, ytm: ytmId(a.ytmusic_url), ytmIndex: k, cover: (a.cover_id && covers.get(a.cover_id)) || null, spotify_url: tr.spotify_url ?? a.spotify_url, youtube_url: tr.youtube_url, title_track: tr.is_title_track }));
    });
    // Stable sort keeps newest-album-first within each group.
    queue.sort((x, y) => Number(y.title_track) - Number(x.title_track));

    const dated = albums.filter((a) => a.release_date);
    return {
      releases,
      tracks: queue.map(({ title_track: _t, ...rest }) => rest),
      videos: mvGrid(albums, tracksByAlbum, gradFor),
      eras: [...dated].reverse().map((a, i) => ({ title: a.title, date: monYear(a.release_date!), grad: gradFor(a.slug), dot: DOTS[i % DOTS.length] })),
    };
  },
  ["music-board"],
  { tags: ["music"], revalidate: 3600 },
);

/** Public music board (albums + tracks). Cache tag `music`; seed data when no database is configured. */
export async function getMusicBoard(): Promise<MusicBoardData> {
  return hasDb() ? loadBoard() : SEED_MUSIC;
}
