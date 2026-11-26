import { isAnonId } from "@/lib/fan/live";

const KEY = "anon_id";
let memory: string | null = null;

/** Anonymous presence id for guests, kept in localStorage. Falls back to a per-page id when storage is blocked. Client only. */
export function getAnonId(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (isAnonId(saved)) return saved;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    memory ??= crypto.randomUUID();
    return memory;
  }
}
