import { NextResponse } from "next/server";
import { logAttendance } from "@/lib/db/fan-live";
import { failure, noStore, rejectForeignPost, roomIdOf, sessionUserId, type RouteCtx } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/fan/live/[id]/attend: "I was here". Called once by each client when its clock hits zero.
 * The server re-checks that the countdown really reached zero and the room is open, then app.log_fan_activity('live_attend')
 * (idempotent per user, countdown and Thai day) does the write. `logged: false` = too early / room closed.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  const bad = rejectForeignPost(req);
  if (bad) return bad;
  const roomId = await roomIdOf(ctx);
  if (typeof roomId !== "string") return roomId;

  const userId = await sessionUserId();
  if (userId === null) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  try {
    return NextResponse.json({ logged: await logAttendance(userId, roomId) }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
