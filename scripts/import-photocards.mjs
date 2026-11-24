// Fills member_era_cards (Photocard collection on member pages) from db/data/photocards.json.
// Images are hotlinked from i.ytimg.com (media.path = URL). Idempotent: re-running rewrites the same rows.
// Remix / language-version releases reuse the photo of their base release (baseEra in the JSON); a release with no photo
// of its own borrows the one named in fallbackEra.
// Usage: node --env-file=.env.local scripts/import-photocards.mjs   (run migrate.mjs first for 0009)
import { readFile } from "node:fs/promises";
import pg from "pg";

const data = JSON.parse(await readFile(new URL("../db/data/photocards.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with --env-file=.env.local)");
  process.exit(1);
}
const ID = /^[\w-]{11}$/;
const img = (id) => {
  if (!ID.test(id)) throw new Error(`bad video id: ${id}`);
  return `https://i.ytimg.com/vi/${id}/oar2.jpg`;
};
const reachable = (u) => fetch(u, { method: "HEAD" }).then((r) => r.ok, () => false);

const c = new pg.Client({ connectionString: url });
await c.connect();
const report = { cards: 0, gaps: [], unreachable: [], unknownAlbums: [] };
try {
  const members = (await c.query("select id, slug, stage_name from members")).rows;
  const albums = (await c.query("select id, title from albums where status = 'published'")).rows;
  for (const t of Object.keys(data.baseEra)) if (!albums.some((a) => a.title === t)) report.unknownAlbums.push(t);

  // Check every image first: one dead link must not leave a broken card on the site.
  const dead = new Set();
  const all = new Set(Object.values(data.cards).flatMap((m) => Object.values(m)));
  for (const id of all) if (!(await reachable(img(id)))) { dead.add(id); report.unreachable.push(id); }

  await c.query("begin");
  for (const m of members) {
    const picks = data.cards[m.slug];
    if (!picks) { report.gaps.push(`${m.slug}: no cards in JSON`); continue; }
    for (const a of albums) {
      const era = data.baseEra[a.title] ?? a.title;
      // fallbackEra: a release with no clean single-member Short borrows the photo of the release it led into (Pretty Please → FOCUS).
      const vid = picks[era] ?? picks[data.fallbackEra?.[era]];
      if (!vid || dead.has(vid)) { report.gaps.push(`${m.slug} / ${a.title}`); continue; }
      const media = await c.query(
        `insert into media (path, mime_type, alt, credit) values ($1, 'image/jpeg', $2, $3)
         on conflict (path) do update set alt = coalesce(media.alt, excluded.alt), credit = coalesce(media.credit, excluded.credit)
         returning id`,
        [img(vid), `${m.stage_name} (official Hearts2Hearts Short)`, data.credit],
      );
      await c.query(
        `insert into member_era_cards (member_id, album_id, media_id) values ($1, $2, $3)
         on conflict (member_id, album_id) do update set media_id = excluded.media_id`,
        [m.id, a.id, media.rows[0].id],
      );
      report.cards++;
    }
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
