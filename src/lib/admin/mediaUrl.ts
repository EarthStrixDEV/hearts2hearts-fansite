import "server-only";
import { canResolveMedia, signedUrl } from "@/lib/neon/storage";

/** Displayable URLs for media.path values: signed (1h) URLs for keys in the private `assets` bucket, X CDN URLs as stored. Missing storage env or a failure → no URL (the UI shows a placeholder). */
export async function signedUrls(keys: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  await Promise.all(
    unique.map(async (k) => {
      if (!canResolveMedia(k)) return;
      try {
        out.set(k, await signedUrl(k));
      } catch {
        /* leave it out */
      }
    }),
  );
  return out;
}
