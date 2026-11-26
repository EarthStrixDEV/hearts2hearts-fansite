import "server-only";

/**
 * Signed-in user's id or null (signed out / banned). The one place fan code reads the user id from; pass it to withUser().
 * Lives here, not in lib/auth (off limits per CLAUDE.md). Loaded lazily because @/lib/auth/server throws at import time
 * when the Neon Auth env vars are missing.
 */
export async function getSessionUserId(): Promise<string | null> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  return (await getCurrentUser())?.id ?? null;
}
