import "server-only";
import { hasStorage, signedUrl } from "@/lib/neon/storage";

/** Signed (1h) URLs for object keys in the private `assets` bucket. Missing storage env or a failure → no URL (the UI shows a placeholder). */
export async function signedUrls(keys: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!hasStorage()) return out;
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  await Promise.all(
    unique.map(async (k) => {
      try {
        out.set(k, await signedUrl(k));
      } catch {
        /* leave it out */
      }
    }),
  );
  return out;
}
