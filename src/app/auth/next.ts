/** `?next=` may only point at a path on this site (no open redirect). */
export function safeNext(v: string | string[] | undefined, fallback: string): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : fallback;
}
