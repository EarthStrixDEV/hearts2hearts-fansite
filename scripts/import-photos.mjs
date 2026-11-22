// Fills the image frames from db/data/photos.json: member portraits + galleries, home hero slides, blog post covers.
// Images are hotlinked from i.ytimg.com (media.path = URL, see migration 0008). Idempotent; publishes what it creates.
// Usage: node --env-file=.env.local scripts/import-photos.mjs
import { readFile } from "node:fs/promises";
import pg from "pg";

const data = JSON.parse(await readFile(new URL("../db/data/photos.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with --env-file=.env.local)");
  process.exit(1);
}
const ID = /^[\w-]{11}$/;
const img = (id, variant) => {
  if (!ID.test(id)) throw new Error(`bad video id: ${id}`);
  return `https://i.ytimg.com/vi/${id}/${variant}.jpg`;
};
const reachable = (u) => fetch(u, { method: "HEAD" }).then((r) => r.ok, () => false);

const c = new pg.Client({ connectionString: url });
await c.connect();
const report = { media: 0, members: 0, gallery: 0, hero: 0, covers: 0, unreachable: [] };
try {
  // Check every image first: one dead link must not leave a broken frame on the site.
  const wanted = [];
  for (const [slug, m] of Object.entries(data.members)) {
    wanted.push([img(m.portrait, "oar2"), `${slug} portrait`]);
    for (const g of m.gallery) wanted.push([img(g, "oar2"), `${slug} gallery`]);
  }
  for (const h of data.hero) wanted.push([img(h.video, "hq720"), `hero ${h.headline}`]);
  for (const [slug, v] of Object.entries(data.postCovers)) wanted.push([img(v, "hq720"), `post ${slug}`]);
  const dead = new Set();
  for (const [u, label] of wanted) if (!(await reachable(u))) { dead.add(u); report.unreachable.push(label); }

  await c.query("begin");
  const media = async (u, alt) => {
    if (dead.has(u)) return null;
    const r = await c.query(
      `insert into media (path, mime_type, alt, credit) values ($1, 'image/jpeg', $2, $3)
       on conflict (path) do update set alt = coalesce(media.alt, excluded.alt), credit = coalesce(media.credit, excluded.credit)
       returning id`,
      [u, alt, data.credit],
    );
    report.media++;
    return r.rows[0].id;
  };

  for (const [slug, m] of Object.entries(data.members)) {
    const row = (await c.query("select id, stage_name from members where slug = $1", [slug])).rows[0];
    if (!row) { report.unreachable.push(`${slug} (no member row)`); continue; }
    const portrait = await media(img(m.portrait, "oar2"), `${row.stage_name} (official Hearts2Hearts Short)`);
    const gallery = [];
    for (const g of m.gallery) {
      const id = await media(img(g, "oar2"), `${row.stage_name} (official Hearts2Hearts Short)`);
      if (id) gallery.push(id);
    }
    await c.query("update members set avatar_id = coalesce($2, avatar_id), cover_id = coalesce($2, cover_id), gallery_ids = $3::uuid[] where id = $1", [row.id, portrait, gallery]);
    report.members++;
    report.gallery += gallery.length;
  }

  // Hero slides: replace the slides this script owns (matched by headline), keep any an editor added.
  await c.query("delete from hero_slides where headline = any($1)", [data.hero.map((h) => h.headline)]);
  for (const [i, h] of data.hero.entries()) {
    const id = await media(img(h.video, "hq720"), `${h.headline} (official music video still)`);
    if (!id) continue;
    await c.query("insert into hero_slides (image_id, headline, subline, sort_order, status) values ($1,$2,$3,$4,'published')", [id, h.headline, h.subline, i]);
    report.hero++;
  }

  for (const [slug, v] of Object.entries(data.postCovers)) {
    const id = await media(img(v, "hq720"), "Official music video still");
    if (!id) continue;
    const r = await c.query("update posts set cover_id = $2 where slug = $1", [slug, id]);
    report.covers += r.rowCount;
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
