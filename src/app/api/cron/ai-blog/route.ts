import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAiBlog } from "@/lib/ai/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Vercel Cron (02:00 UTC = 09:00 Asia/Bangkok) sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runAiBlog();
  return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200 });
}
