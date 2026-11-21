"use server";

import { withActor } from "@/lib/neon/db";
import { gate } from "../auth";
import { dbError, fail, fallbackSlug, isUrl, isUuid, ok, orNull, parseDuration, slugify, statusOf, str } from "../form";
import { revalidateTags } from "../revalidate";
import { insertSql, updateSql } from "../sql";
import type { ActionState } from "../types";

interface TrackIn { id?: string; title: string; duration: string; title_track: boolean }

function parseTracks(json: string): TrackIn[] | null {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return null;
    return raw.map((t) => ({
      id: typeof t?.id === "string" && isUuid(t.id) ? t.id : undefined,
      title: String(t?.title ?? "").trim(),
      duration: String(t?.duration ?? "").trim(),
      title_track: !!t?.title_track,
    })).filter((t) => t.title);
  } catch {
    return null;
  }
}

export async function saveAlbum(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);

  const id = str(fd, "id");
  if (id && !isUuid(id)) return fail("Invalid release.");
  const title = str(fd, "title");
  if (!title) return fail("Title is required.");
  const type = str(fd, "album_type");
  if (!["single", "ep", "album"].includes(type)) return fail("Pick a release type.");
  const date = str(fd, "release_date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Release date must be a valid date.");
  const spotify = str(fd, "spotify_url");
  if (spotify && !isUrl(spotify)) return fail("Spotify URL must start with http(s)://");
  const cover = str(fd, "cover_id");
  const tracks = parseTracks(str(fd, "tracks_json") || "[]");
  if (!tracks) return fail("Tracklist could not be read. Reload and try again.");
  for (const t of tracks) if (t.duration && parseDuration(t.duration) === null) return fail(`Track "${t.title}": duration must look like 3:12.`);

  const row = {
    slug: slugify(str(fd, "slug")) || slugify(title) || fallbackSlug("release"),
    title,
    album_type: type,
    release_date: date || null,
    cover_id: isUuid(cover) ? cover : null,
    description: orNull(fd, "description"),
    spotify_url: spotify || null,
    status: statusOf(fd),
    updated_by: g.userId,
  };

  try {
    const albumId = await withActor(g.userId, async (q) => {
      const { text, params } = id ? updateSql("albums", row, id, "id") : insertSql("albums", row, "id");
      const [a] = await q<{ id: string }>(text, params);
      if (!a) throw new Error("That release no longer exists.");

      // Tracks: keep ids stable (track_members hangs off them). Park kept rows at 1000+n first to dodge unique(album_id, track_no).
      const keep = tracks.map((t) => t.id).filter((i): i is string => !!i);
      await q(`delete from tracks where album_id = $1 and not (id = any($2::uuid[]))`, [a.id, keep]);
      for (const [i, t] of tracks.entries()) if (t.id) await q(`update tracks set track_no = $1 where id = $2 and album_id = $3`, [1000 + i + 1, t.id, a.id]);
      for (const [i, t] of tracks.entries()) {
        const dur = parseDuration(t.duration);
        if (t.id) await q(`update tracks set track_no = $1, title = $2, duration_sec = $3, is_title_track = $4 where id = $5 and album_id = $6`, [i + 1, t.title, dur, t.title_track, t.id, a.id]);
        else await q(`insert into tracks (album_id, track_no, title, duration_sec, is_title_track) values ($1, $2, $3, $4, $5)`, [a.id, i + 1, t.title, dur, t.title_track]);
      }
      return a.id;
    });
    revalidateTags(["home", "music"]);
    const verb = row.status === "published" ? "published" : row.status === "archived" ? "archived" : "saved as draft";
    return ok(`${title} ${verb}`, `/admin/music?id=${albumId}`);
  } catch (e) {
    return fail(dbError(e));
  }
}

export async function deleteAlbum(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await gate("editor");
  if (!g.ok) return fail(g.message);
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Nothing to delete.");
  try {
    await withActor(g.userId, (q) => q(`delete from albums where id = $1`, [id]));
    revalidateTags(["home", "music"]);
    return ok("Release deleted", "/admin/music");
  } catch (e) {
    return fail(dbError(e));
  }
}
