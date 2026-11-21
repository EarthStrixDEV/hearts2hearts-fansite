import "server-only";
import { Pool, type QueryResultRow } from "pg";

// Neon pooled connection (PgBouncer) for app traffic. Use DATABASE_URL_UNPOOLED only for migrations/DDL.
declare global {
  // eslint-disable-next-line no-var
  var __h2hPool: Pool | undefined;
}

export const hasDb = () => Boolean(process.env.DATABASE_URL);

function pool(): Pool {
  if (!globalThis.__h2hPool) {
    globalThis.__h2hPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  }
  return globalThis.__h2hPool;
}

/** Parameterised query. Always pass user input via `params`, never interpolate into `text`. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

/** Transaction whose writes are attributed to `userId` in activity_log (read by the log_activity trigger via app.user_id). */
export function withActor<T>(userId: string, fn: Parameters<typeof withTx<T>>[0]): Promise<T> {
  return withTx(async (q) => {
    await q("select set_config('app.user_id', $1, true)", [userId]);
    return fn(q);
  });
}

/** Runs `fn` inside a transaction on a dedicated connection. */
export async function withTx<T>(fn: (q: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const out = await fn(async (text, params = []) => (await client.query(text, params)).rows);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
