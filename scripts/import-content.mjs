// Imports db/data/content.json (quiz questions, Memory Match cards, blog posts) into Neon. Idempotent.
// Quiz/card rows are keyed by payload.key; posts by slug. Posts are marked source='ai' (written by AI from cited sources).
// Everything is `draft` unless --publish is passed.
// Usage: node --env-file=.env.local scripts/import-content.mjs [--publish]
import { readFile } from "node:fs/promises";
import pg from "pg";

const publish = process.argv.includes("--publish");
const status = publish ? "published" : "draft";
const data = JSON.parse(await readFile(new URL("../db/data/content.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with --env-file=.env.local)");
  process.exit(1);
}

// Basic sanity checks so a bad edit cannot ship a broken question or an unsourced fact.
for (const q of data.questions) {
  if (!q.options.includes(q.answer)) throw new Error(`answer not in options: ${q.key}`);
  if (q.options.length < 2 || q.options.length > 4) throw new Error(`2-4 options needed: ${q.key}`);
  if (!q.source?.url?.startsWith("https://")) throw new Error(`source missing: ${q.key}`);
}
if (data.cards.length !== 8) throw new Error("exactly 8 cards are required");
for (const c of data.cards) if (!c.source?.url?.startsWith("https://")) throw new Error(`source missing: ${c.key}`);
for (const p of data.posts) if (!p.body.some((l) => l.startsWith("## Sources"))) throw new Error(`Sources section missing: ${p.slug}`);

const c = new pg.Client({ connectionString: url });
await c.connect();
try {
  await c.query("begin");

  // game_items: replace our keyed rows (is_active follows --publish, so run it with --publish to make them playable).
  const keys = [...data.questions, ...data.cards].map((i) => i.key);
  await c.query("delete from game_items where payload->>'key' = any($1)", [keys]);
  const insertItem = (kind, payload, i) =>
    c.query("insert into game_items (kind, payload, is_active, sort_order) values ($1, $2::jsonb, $3, $4)", [kind, JSON.stringify(payload), publish, i]);
  for (const [i, q] of data.questions.entries()) await insertItem("question", q, i);
  for (const [i, k] of data.cards.entries()) await insertItem("card", k, i);

  // posts + tags
  for (const [i, p] of data.posts.entries()) {
    const when = `now() - interval '${(data.posts.length - i) * 5} minutes'`; // keeps chronological order, newest topic last
    const { rows } = await c.query(
      `insert into posts (slug, title, excerpt, body_md, source, status, published_at)
       values ($1,$2,$3,$4,'ai',$5, ${when})
       on conflict (slug) do update set title=excluded.title, excerpt=excluded.excerpt, body_md=excluded.body_md, source='ai',
         status = case when excluded.status = 'published' then 'published'::content_status else posts.status end
       returning id`,
      [p.slug, p.title, p.excerpt, p.body.join("\n"), status],
    );
    const id = rows[0].id;
    await c.query("delete from post_tags where post_id = $1", [id]);
    for (const name of p.tags) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const t = await c.query("insert into tags (slug, name) values ($1,$2) on conflict (slug) do update set name = excluded.name returning id", [slug, name]);
      await c.query("insert into post_tags (post_id, tag_id) values ($1,$2) on conflict do nothing", [id, t.rows[0].id]);
    }
  }
  await c.query("commit");
  const n = (await c.query(
    `select (select count(*) from game_items where kind='question' and is_active) q_active,
            (select count(*) from game_items where kind='question') q_all,
            (select count(*) from game_items where kind='card') cards,
            (select count(*) from posts) posts, (select count(*) from tags) tags`,
  )).rows[0];
  console.log(`imported as ${status}:`, JSON.stringify(n));
} catch (e) {
  await c.query("rollback");
  console.error("FAILED, rolled back:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
