import { hasDb, query } from "@/lib/neon/db";
import { canResolveMedia, signedUrl } from "@/lib/neon/storage";

// Signed bucket URLs outlive the 1h page cache so a cached page never points at an expired link; X image URLs never expire.
const TTL = 24 * 3600;

/** media.id → displayable URL for images (X CDN URL as stored, or a signed bucket URL). Unresolvable ids are left out. */
export async function resolveMediaUrls(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const want = [...new Set(ids.filter((i): i is string => !!i))];
  if (!hasDb() || !want.length) return out;
  const rows = await query<{ id: string; path: string }>(
    `select id, path from media where id = any($1::uuid[]) and mime_type like 'image/%'`,
    [want],
  );
  await Promise.all(
    rows.map(async (m) => {
      if (!canResolveMedia(m.path)) return;
      try {
        out.set(m.id, await signedUrl(m.path, TTL));
      } catch {
        /* missing object: the page keeps its gradient placeholder */
      }
    }),
  );
  return out;
}
