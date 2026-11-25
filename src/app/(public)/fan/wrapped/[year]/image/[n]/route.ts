import { NextResponse } from "next/server";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";
import { getWrappedSnapshot } from "@/lib/db/fan-wrapped";
import { buildSlides, parseYear } from "@/lib/fan/wrapped";
import { renderSlidePng } from "@/lib/fan/wrapped-image";
import { hasStorage, storage } from "@/lib/neon/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /fan/wrapped/<year>/image/<n>[?download=1]: slide n (0-based) of the signed-in fan's own Wrapped as a 1080x1920 PNG.
 * Serves the copy the cron stored in the bucket; renders it on the spot when there is none (or storage is not configured).
 */
export async function GET(req: Request, ctx: { params: Promise<{ year: string; n: string }> }) {
  const { year: rawYear, n: rawN } = await ctx.params;
  const year = parseYear(rawYear, new Date().getUTCFullYear());
  if (year === null || !/^\d{1,2}$/.test(rawN)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!hasFanDb()) return NextResponse.json({ error: "not available" }, { status: 503 });

  let userId: string | null = null;
  try {
    userId = await getSessionUserId();
  } catch (e) {
    console.error("wrapped image: session lookup failed", e);
  }
  if (!userId) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const data = await getWrappedSnapshot(userId, year);
  const slides = data ? buildSlides(data) : [];
  const i = Number(rawN);
  if (!data || i >= slides.length) return NextResponse.json({ error: "not found" }, { status: 404 });

  let png: Uint8Array | null = null;
  const key = data.images[i];
  if (key && hasStorage()) {
    try {
      png = new Uint8Array(await (await storage().download(key)).arrayBuffer());
    } catch (e) {
      console.error("wrapped image: stored copy unreadable, rendering instead", e);
    }
  }
  png ??= await renderSlidePng(slides[i], i, slides.length, data.nickname);

  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="s2u-wrapped-${year}-${i + 1}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
