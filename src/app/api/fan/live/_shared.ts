import "server-only";
import { NextResponse } from "next/server";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";
import { LiveError, UUID } from "@/lib/db/fan-live";

// Helpers shared by the /api/fan/live/[id]/* route handlers (a private file: only route.ts files are routes).

export type RouteCtx = { params: Promise<{ id: string }> };

/** Signed-in user id, or null for guests. Missing/broken auth env must not take the public countdown down. */
export async function sessionUserId(): Promise<string | null> {
  try {
    return await getSessionUserId();
  } catch {
    return null;
  }
}

/** Guards every handler: database configured, id is a uuid. Returns the room id or an error response. */
export async function roomIdOf(ctx: RouteCtx): Promise<string | NextResponse> {
  if (!hasFanDb()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return id;
}

/**
 * POST-only CSRF guard: the request must be JSON (a cross-site HTML form cannot send that) and, when the browser sends an
 * Origin header, it must be this site.
 */
export function rejectForeignPost(req: Request): NextResponse | null {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "json_required" }, { status: 415 });
  }
  const origin = req.headers.get("origin");
  if (origin) {
    let host: string | null = null;
    try { host = new URL(origin).host; } catch { /* malformed origin: rejected below */ }
    if (host !== (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  return null;
}

const STATUS = { slow_mode: 429, closed: 403, not_allowed: 403, sign_in: 401, not_found: 404 } as const;

/** Maps a LiveError to a JSON response; anything else is logged and becomes a 500 (no details leaked). */
export function failure(e: unknown): NextResponse {
  if (e instanceof LiveError) {
    return NextResponse.json({ error: e.kind, ...(e.slowModeSec !== undefined ? { slowModeSec: e.slowModeSec } : {}) }, { status: STATUS[e.kind] });
  }
  console.error("fan live: unexpected error", e);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

export const noStore = { "Cache-Control": "no-store" } as const;
