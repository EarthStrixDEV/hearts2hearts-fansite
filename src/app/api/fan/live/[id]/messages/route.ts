import { NextResponse } from "next/server";
import { z } from "zod";
import { postMessage } from "@/lib/db/fan-live";
import { MAX_MESSAGE_LEN } from "@/lib/fan/live";
import { failure, noStore, rejectForeignPost, roomIdOf, sessionUserId, type RouteCtx } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ body: z.string().trim().min(1).max(MAX_MESSAGE_LEN) });

/**
 * POST /api/fan/live/[id]/messages { body }: sends a chat message. Signed-in only.
 * 429 { error: "slow_mode", slowModeSec } when the slow-mode trigger refuses; 403 when the room is closed or the account is banned.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  const bad = rejectForeignPost(req);
  if (bad) return bad;
  const roomId = await roomIdOf(ctx);
  if (typeof roomId !== "string") return roomId;

  const userId = await sessionUserId();
  if (userId === null) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    return NextResponse.json({ message: await postMessage(userId, roomId, body.data.body) }, { status: 201, headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
