import { NextResponse } from "next/server";
import { cheer } from "@/lib/db/fan-live";
import { CHEERS_PER_SEC, createLimiter } from "@/lib/fan/live";
import { failure, noStore, rejectForeignPost, roomIdOf, sessionUserId, type RouteCtx } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 cheers per second per user, in memory (per server instance: best effort, the DB function still gates room + ban).
const limiter = createLimiter(CHEERS_PER_SEC, 1_000);

/** POST /api/fan/live/[id]/cheer: adds one cheer via app.cheer(). Signed-in only; 403 when the room is not open. */
export async function POST(req: Request, ctx: RouteCtx) {
  const bad = rejectForeignPost(req);
  if (bad) return bad;
  const roomId = await roomIdOf(ctx);
  if (typeof roomId !== "string") return roomId;

  const userId = await sessionUserId();
  if (userId === null) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  if (!limiter.allow(userId, Date.now())) return NextResponse.json({ error: "too_fast" }, { status: 429, headers: noStore });

  try {
    return NextResponse.json({ cheers: await cheer(userId, roomId) }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
