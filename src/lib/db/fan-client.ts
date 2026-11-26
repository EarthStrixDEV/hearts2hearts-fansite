import "server-only";
import { Pool, type QueryResultRow } from "pg";

// Request-scoped client for the fan club. Connects as the non-owner role `fan_app` (DATABASE_URL_APP, pooled), so the RLS
// policies from migration 0010 apply. Crons, migrations and the seed use the owner client in neon/db.ts instead.
declare global {
  var __h2hFanPool: Pool | undefined;
}

export const hasFanDb = () => Boolean(process.env.DATABASE_URL_APP);

function pool(): Pool {
  if (!globalThis.__h2hFanPool) {
    globalThis.__h2hFanPool = new Pool({ connectionString: process.env.DATABASE_URL_APP, max: 10 });
  }
  return globalThis.__h2hFanPool;
}

export type UserQuery = <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<R[]>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs `fn` in one transaction as `fan_app` with app.user_id set to `userId` (null = guest). Policies read it via app.uid().
 * Always pass user input through `params`, never into `text`. The id is set transaction-locally, so it is PgBouncer safe.
 */
export async function withUser<T>(userId: string | null, fn: (q: UserQuery) => Promise<T>): Promise<T> {
  if (userId !== null && !UUID.test(userId)) throw new Error("withUser: userId must be a uuid or null");
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
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
