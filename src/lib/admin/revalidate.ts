import { revalidateTag } from "next/cache";

// Cache tags from docs/spec.md §3. Per-entity tags are `member:{slug}` and `post:{slug}`.
const TAG = /^(?:home|members|music|posts|events|city|pages|settings|game|(?:member|post):[^\s]{1,80})$/;

export const isValidTag = (t: unknown): t is string => typeof t === "string" && TAG.test(t);

/** Shared by server actions and POST /api/revalidate. Expires immediately (editors expect to see their edit). Drops unknown tags. */
export function revalidateTags(tags: (string | null | undefined)[]): string[] {
  const done: string[] = [];
  for (const t of new Set(tags)) {
    if (isValidTag(t)) {
      revalidateTag(t, { expire: 0 });
      done.push(t);
    }
  }
  return done;
}
