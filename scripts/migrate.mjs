// Applies db/migrations/*.sql in filename order against DATABASE_URL_UNPOOLED (Neon direct connection).
// Each file runs in its own transaction and is recorded in public.schema_migrations; re-running skips applied files.
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with: node --env-file=.env.local scripts/migrate.mjs)");
  process.exit(1);
}

const dir = new URL("../db/migrations/", import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({ connectionString: url });
await client.connect();
let failed = false;
try {
  // one runner at a time (session-level lock; needs the unpooled connection)
  await client.query("select pg_advisory_lock(727274)");
  await client.query(
    "create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));

  for (const f of files) {
    if (done.has(f)) {
      console.log(`skip   ${f}`);
      continue;
    }
    const sql = await readFile(new URL(f, dir), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`apply  ${f}`);
    } catch (e) {
      await client.query("rollback");
      console.error(`FAILED ${f}: ${e.message}`);
      failed = true;
      break;
    }
  }
} finally {
  await client.end();
}
process.exit(failed ? 1 : 0);
