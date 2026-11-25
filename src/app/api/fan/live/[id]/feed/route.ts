import { NextResponse } from "next/server";
import { z } from "zod";
import { getFeed } from "@/lib/db/fan-live";
import { failure, noStore, roomIdOf, sessionUserId, type RouteCtx } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({ after: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional() });

/**
 * GET /api/fan/live/[id]/feed?after=<lastId>: new chat messages, cheer total, online count and the server's clock.
 * Guests get counts only (RLS hides chat from them): `canRead` is false and `messages` is empty.
 */
export async function GET(req: Request, ctx: RouteCtx) {
  const roomId = await roomIdOf(ctx);
  if (typeof roomId !== "string") return roomId;

  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const feed = await getFeed(await sessionUserId(), roomId, q.data.after ?? null);
    if (!feed) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(feed, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
