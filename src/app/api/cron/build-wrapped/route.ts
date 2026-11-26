import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedCron } from "@/lib/cron";
import { buildWrapped } from "@/lib/fan/wrapped-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Schedule (lead registers it in vercel.json): "0 0 1 12 *" = Dec 1, 00:00 UTC. Safe to call again (upsert); each call renders
// what is still missing within ~4 minutes and answers how many are `remaining`, so a second call finishes a big fandom.
const Query = z.object({ year: z.coerce.number().int().min(2025).max(2100).optional() });

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return NextResponse.json({ error: "year must be an integer from 2025" }, { status: 400 });

  try {
    const year = q.data.year ?? new Date().getUTCFullYear();
    return NextResponse.json(await buildWrapped(year));
  } catch (e) {
    console.error("build-wrapped failed", e);
    return NextResponse.json({ error: "build failed" }, { status: 500 });
  }
}
