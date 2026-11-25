import "server-only";
import { NextResponse } from "next/server";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";

// Shared bits of the /api/fan/notice routes.
export const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Browsers send Origin on cross-site POSTs; a different host is refused (the session cookie alone must not be enough). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export type Gate = { ok: true; userId: string } | { ok: false; res: NextResponse };

/** Origin check, database configured, signed in. Auth env missing counts as signed out. */
export async function gateUser(req: Request): Promise<Gate> {
  if (!sameOrigin(req)) return { ok: false, res: json(403, { error: "bad_origin" }) };
  if (!hasFanDb()) return { ok: false, res: json(503, { error: "The fan club database isn't configured." }) };
  let userId: string | null = null;
  try {
    userId = await getSessionUserId();
  } catch (e) {
    console.error("notice: session lookup failed", e);
  }
  return userId ? { ok: true, userId } : { ok: false, res: json(401, { error: "Sign in to read notices." }) };
}
