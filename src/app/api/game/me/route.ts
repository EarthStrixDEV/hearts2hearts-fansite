import { NextResponse } from "next/server";
import { hasDb } from "@/lib/neon/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who am I, for the game page: { online, user }. `online` = a database exists so scores can be posted. Never cached. */
export async function GET() {
  if (!hasDb()) return NextResponse.json({ online: false, user: null }, { headers: { "Cache-Control": "no-store" } });
  let user = null;
  try {
    const u = await getCurrentUser();
    user = u ? { id: u.id, name: u.displayName || u.email.split("@")[0] } : null;
  } catch (e) {
    console.error("game/me failed", e);
  }
  return NextResponse.json({ online: true, user }, { headers: { "Cache-Control": "no-store" } });
}
