import "server-only";
import { auth } from "@/lib/auth/server";
import { queryOne } from "@/lib/neon/db";
import type { UserRole } from "@/lib/db/types";

export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
}

const RANK: Record<UserRole, number> = { fan: 0, editor: 1, admin: 2 };

/**
 * Current signed-in user + app role, or null (signed out / banned).
 * Identity comes from Neon Auth (neon_auth."user"); the app role lives in public.profiles.
 * The profile row is created lazily on first sight (no trigger on the managed neon_auth schema).
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: session } = await auth.getSession();
  const u = session?.user;
  if (!u) return null;
  const p = await queryOne<{ role: UserRole; is_banned: boolean; display_name: string | null }>(
    `insert into profiles (id, display_name, avatar_url) values ($1, $2, $3)
     on conflict (id) do update set display_name = coalesce(profiles.display_name, excluded.display_name)
     returning role, is_banned, display_name`,
    [u.id, u.name ?? null, u.image ?? null],
  );
  if (!p || p.is_banned) return null;
  return { id: u.id, email: u.email, displayName: p.display_name, role: p.role };
}

/** Authorization gate for route handlers / server actions. Returns the user or null if the role is insufficient. */
export async function requireRole(min: UserRole): Promise<AppUser | null> {
  const user = await getCurrentUser();
  return user && RANK[user.role] >= RANK[min] ? user : null;
}
