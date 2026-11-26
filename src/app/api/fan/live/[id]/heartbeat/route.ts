import { NextResponse } from "next/server";
import { z } from "zod";
import { heartbeat } from "@/lib/db/fan-live";
import { createLimiter, isAnonId } from "@/lib/fan/live";
import { failure, noStore, rejectForeignPost, roomIdOf, sessionUserId, type RouteCtx } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ anonId: z.string().refine(isAnonId).optional() });
// Clients beat every 20 s; one write per 5 s per identity is plenty (best effort: per server instance).
const limiter = createLimiter(1, 5_000);

/** POST /api/fan/live/[id]/heartbeat: presence upsert. Signed-in fans by user id, guests by `anonId` (localStorage). */
export async function POST(req: Request, ctx: RouteCtx) {
  const bad = rejectForeignPost(req);
  if (bad) return bad;
  const roomId = await roomIdOf(ctx);
  if (typeof roomId !== "string") return roomId;

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const userId = await sessionUserId();
  const anonId = userId === null ? (body.data.anonId ?? null) : null;
  if (userId === null && anonId === null) return NextResponse.json({ error: "anon_id_required" }, { status: 400 });

  if (!limiter.allow(`${roomId}:${userId ?? anonId}`, Date.now())) return NextResponse.json({ error: "too_fast" }, { status: 429, headers: noStore });
  try {
    return NextResponse.json({ online: await heartbeat(userId, roomId, anonId) }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
