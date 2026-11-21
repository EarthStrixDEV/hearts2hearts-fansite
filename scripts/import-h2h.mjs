// Imports db/data/h2h.json (members + facts, albums + tracks) into Neon. Idempotent: upserts by slug / (album, track_no).
// Everything lands as `draft` so an editor reviews it in /admin before it goes public. Pass --publish to publish instead.
// Usage: node --env-file=.env.local scripts/import-h2h.mjs [--publish]
import { readFile } from "node:fs/promises";
import pg from "pg";

const wantPublish = process.argv.includes("--publish");
const data = JSON.parse(await readFile(new URL("../db/data/h2h.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with --env-file=.env.local)");
  process.exit(1);
}

const hold = new Set(data.hold_as_draft ?? []); // single-source / unconfirmed releases stay draft even with --publish
const statusFor = (slug) => (wantPublish && !hold.has(slug) ? "published" : "draft");
const c = new pg.Client({ connectionString: url });
await c.connect();
try {
  await c.query("begin");
  // Re-running never downgrades status (an editor's published rows stay published); --publish upgrades drafts.
  for (const [i, m] of data.members.entries()) {
    const { rows } = await c.query(
      `insert into members (slug, stage_name, name_ko, real_name, birth_date, position, color_hex, bio, sort_order, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (slug) do update set stage_name=excluded.stage_name, name_ko=excluded.name_ko, real_name=excluded.real_name,
         birth_date=excluded.birth_date, position=excluded.position, color_hex=excluded.color_hex, bio=excluded.bio, sort_order=excluded.sort_order,
         status = case when excluded.status = 'published' then 'published'::content_status else members.status end
       returning id`,
      [m.slug, m.stage_name, m.name_ko, m.real_name, m.birth_date, m.position, m.color_hex, m.bio, i + 1, statusFor(m.slug)],
    );
    const id = rows[0].id;
    await c.query("delete from member_facts where member_id = $1", [id]);
    for (const [j, [label, value]] of m.facts.entries()) {
      await c.query("insert into member_facts (member_id, label, value, sort_order) values ($1,$2,$3,$4)", [id, label, value, j]);
    }
  }
  await c.query("delete from albums where slug = any($1)", [data.remove_albums ?? []]);
  for (const a of data.albums) {
    const { rows } = await c.query(
      `insert into albums (slug, title, album_type, release_date, description, status)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (slug) do update set title=excluded.title, album_type=excluded.album_type, release_date=excluded.release_date, description=excluded.description,
         status = case when excluded.status = 'published' then 'published'::content_status else albums.status end
       returning id`,
      [a.slug, a.title, a.album_type, a.release_date, a.description, statusFor(a.slug)],
    );
    const id = rows[0].id;
    await c.query("delete from tracks where album_id = $1 and track_no > $2", [id, a.tracks.length]);
    for (const [k, [title, dur, isTitle]] of a.tracks.entries()) {
      await c.query(
        `insert into tracks (album_id, track_no, title, duration_sec, is_title_track) values ($1,$2,$3,$4,$5)
         on conflict (album_id, track_no) do update set title=excluded.title, duration_sec=excluded.duration_sec, is_title_track=excluded.is_title_track`,
        [id, k + 1, title, dur, isTitle],
      );
    }
  }
  await c.query("commit");
  const n = (await c.query("select (select count(*) from members) m, (select count(*) from member_facts) f, (select count(*) from albums) a, (select count(*) from tracks) t")).rows[0];
  console.log(`imported (${wantPublish ? "publish, minus hold list" : "draft"}):`, JSON.stringify(n));
} catch (e) {
  await c.query("rollback");
  console.error("FAILED, rolled back:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
