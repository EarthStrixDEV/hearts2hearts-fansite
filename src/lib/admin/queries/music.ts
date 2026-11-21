import "server-only";
import type { Album, Track } from "@/lib/db/types";
import { query, queryOne, hasDb } from "@/lib/neon/db";
import { cleanQ } from "../db";
import { ALBUM_COLS, likeOf, TRACK_COLS, Where } from "../sql";

export interface AlbumRow extends Album { track_count: number }

export async function listAlbums(q?: string, type?: string, status?: string): Promise<AlbumRow[]> {
  if (!hasDb()) return [];
  const w = new Where();
  if (type && ["single", "ep", "album"].includes(type)) w.add("album_type = ?", type);
  if (status && ["draft", "published", "archived"].includes(status)) w.add("status = ?", status);
  const s = cleanQ(q);
  if (s) w.add("title ilike ?", likeOf(s));
  return query<AlbumRow>(
    `select ${ALBUM_COLS}, (select count(*)::int from tracks t where t.album_id = albums.id) as track_count
       from albums ${w.clause} order by release_date desc nulls first, title`,
    w.params,
  );
}

export async function getAlbum(id: string): Promise<{ album: Album; tracks: Track[] } | null> {
  if (!hasDb() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const album = await queryOne<Album>(`select ${ALBUM_COLS} from albums where id = $1`, [id]);
  if (!album) return null;
  const tracks = await query<Track>(`select ${TRACK_COLS} from tracks where album_id = $1 order by track_no`, [id]);
  return { album, tracks };
}
