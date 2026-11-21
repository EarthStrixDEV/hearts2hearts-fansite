import { hasDb } from "@/lib/neon/db";

/** True when the admin can read/write: a database plus Neon Auth are configured. Otherwise the admin is a read-only preview. */
export const adminConfigured = () =>
  hasDb() && Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

/** Strip characters we don't want in a search term. */
export const cleanQ = (q?: string) => (q ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 80);

/** Next searchParams values can be string | string[]. */
export const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
