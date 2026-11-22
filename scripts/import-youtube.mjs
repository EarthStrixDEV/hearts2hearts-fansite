// Links releases to YouTube: YouTube Music playlist (albums.ytmusic_url), release art (media row + albums.cover_id,
// hotlinked from i.ytimg.com (art-track thumbnail)) and MV video links (tracks.youtube_url). Idempotent.
// Usage: node --env-file=.env.local scripts/import-youtube.mjs
import { readFile } from "node:fs/promises";
import pg from "pg";

const data = JSON.parse(await readFile(new URL("../db/data/youtube.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with --env-file=.env.local)");
  process.exit(1);
}
const PLAYLIST = /^OLAK[A-Za-z0-9_-]+$/;
const VIDEO = /^[\w-]{11}$/;
const ok200 = (u) => fetch(u, { method: "HEAD" }).then((r) => r.ok, () => false);

const c = new pg.Client({ connectionString: url });
await c.connect();
const report = { covers: 0, coverMissing: [], playlists: 0, mvs: 0, mvMissing: [] };
try {
  await c.query("begin");
  for (const a of data.albums) {
    if (!PLAYLIST.test(a.playlist)) throw new Error(`bad playlist id for ${a.slug}`);
    const album = (await c.query("select id, title from albums where slug = $1", [a.slug])).rows[0];
    if (!album) { report.coverMissing.push(`${a.slug} (no album row)`); continue; }
    if (!VIDEO.test(a.art)) throw new Error(`bad art video id for ${a.slug}`);
    const hi = `https://i.ytimg.com/vi/${a.art}/maxresdefault.jpg`;
    const cover = (await ok200(hi)) ? hi : `https://i.ytimg.com/vi/${a.art}/hqdefault.jpg`;
    const ok = await ok200(cover);
    let coverId = null;
    if (ok) {
      const m = await c.query(
        `insert into media (path, mime_type, alt, credit) values ($1, 'image/jpeg', $2, 'YouTube Music release art')
         on conflict (path) do update set alt = coalesce(media.alt, excluded.alt) returning id`,
        [cover, `${album.title} cover art`],
      );
      coverId = m.rows[0].id;
      report.covers++;
    } else report.coverMissing.push(`${a.slug} (image not reachable)`);
    await c.query("update albums set ytmusic_url = $2, cover_id = coalesce($3, cover_id) where id = $1", [album.id, `https://music.youtube.com/playlist?list=${a.playlist}`, coverId]);
    report.playlists++;
  }
  for (const v of data.mvs) {
    if (!VIDEO.test(v.video)) throw new Error(`bad video id: ${v.video}`);
    const r = await c.query(
      "update tracks set youtube_url = $3 where title = $2 and album_id = (select id from albums where slug = $1)",
      [v.album, v.track, `https://www.youtube.com/watch?v=${v.video}`],
    );
    if (r.rowCount) report.mvs += r.rowCount;
    else report.mvMissing.push(`${v.album} / ${v.track}`);
  }
  await c.query("commit");
  console.log(JSON.stringify(report, null, 1));
} catch (e) {
  await c.query("rollback");
  console.error("FAILED, rolled back:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
