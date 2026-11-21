import { NextResponse, type NextRequest } from "next/server";
import { gate } from "@/lib/admin/auth";
import { isValidTag, revalidateTags } from "@/lib/admin/revalidate";

export const dynamic = "force-dynamic";

/** POST /api/revalidate  { "tag": "members" } or { "tags": ["posts", "post:my-slug"] }. Editor role or higher (spec §3). */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });

  const g = await gate("editor");
  if (!g.ok) return NextResponse.json({ ok: false, error: g.message }, { status: g.status });

  const body = (await req.json().catch(() => null)) as { tag?: unknown; tags?: unknown } | null;
  const asked = [...(typeof body?.tag === "string" ? [body.tag] : []), ...(Array.isArray(body?.tags) ? body.tags : [])];
  if (!asked.length || asked.length > 20 || !asked.every(isValidTag)) {
    return NextResponse.json({ ok: false, error: "Send `tag` or `tags` with known cache tags (home, members, member:{slug}, music, posts, post:{slug}, events, city, pages, settings, game)." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, revalidated: revalidateTags(asked) });
}
