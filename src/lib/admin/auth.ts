import { cache } from "react";
import { adminConfigured } from "./db";
import { hasRole, type NeedRole } from "./roles";
import type { UserRole } from "@/lib/db/types";

export interface AdminContext {
  /** false when the database / Neon Auth env vars are missing: the admin renders read-only. */
  configured: boolean;
  userId: string | null;
  name: string;
  role: UserRole | null;
}

// Loaded lazily: importing @/lib/auth/server throws when the Neon Auth env vars are missing.
const session = () => import("@/lib/auth/session");

/** Current admin user + role (Neon Auth identity, role from public.profiles). Deduped per request. */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  if (!adminConfigured()) return { configured: false, userId: null, name: "Preview", role: "admin" };
  const u = await (await session()).getCurrentUser();
  if (!u) return { configured: true, userId: null, name: "Guest", role: null };
  return { configured: true, userId: u.id, name: u.displayName || u.email, role: u.role };
});

export type Gate = { ok: true; userId: string } | { ok: false; message: string; status: 401 | 403 | 503 };

/**
 * Authorization gate for every server action and route handler (there is no RLS-as-authorization any more).
 * 503 = not configured, 401 = signed out / banned, 403 = role too low.
 */
export async function gate(need: NeedRole): Promise<Gate> {
  if (!adminConfigured()) return { ok: false, status: 503, message: "The database isn't configured, so the admin is read-only." };
  const u = await (await session()).getCurrentUser();
  if (!u) return { ok: false, status: 401, message: "Your session expired. Sign in again." };
  if (!hasRole(u.role, need)) return { ok: false, status: 403, message: "You don't have permission to do that." };
  return { ok: true, userId: u.id };
}
