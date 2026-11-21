import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { gate } from "@/lib/admin/auth";
import { revalidateTags } from "@/lib/admin/revalidate";
import { withActor } from "@/lib/neon/db";
import { hasStorage, storage } from "@/lib/neon/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
// SVG is deliberately excluded (scripts). .glb is for Mini City models.
const TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "model/gltf-binary": "glb",
};
const err = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const dim = (v: FormDataEntryValue | null) => {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 && n < 100000 ? n : null;
};

/** POST multipart { file, width?, height? } → stores `media/<uuid>.<ext>` in the private bucket and inserts a media row. Editor+. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return err(403, "bad_origin");
  const g = await gate("editor");
  if (!g.ok) return err(g.status, g.message);
  if (!hasStorage()) return err(503, "Object storage isn't configured.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return err(400, "No file received.");
  if (file.size === 0 || file.size > MAX_BYTES) return err(413, "Files must be between 1 byte and 10 MB.");

  // Server-side mime check: trust the declared type only if the bytes agree (magic numbers).
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) return err(415, "Only PNG, JPEG, WebP, GIF, AVIF images and .glb models can be uploaded.");
  const mime = Object.entries(TYPES).find(([, e]) => e === ext)![0];

  const key = `media/${randomUUID()}.${ext}`;
  try {
    await storage().upload(key, bytes, { contentType: mime });
    const [row] = await withActor(g.userId, (q) =>
      q<{ id: string }>(
        `insert into media (path, mime_type, width, height, uploaded_by) values ($1, $2, $3, $4, $5) returning id`,
        [key, mime, mime.startsWith("image/") ? dim(form!.get("width")) : null, mime.startsWith("image/") ? dim(form!.get("height")) : null, g.userId],
      ),
    );
    revalidateTags(["home"]);
    return NextResponse.json({ ok: true, id: row?.id, path: key }, { status: 201 });
  } catch (e) {
    await storage().delete(key).catch(() => undefined);
    return err(500, e instanceof Error ? e.message : "Upload failed.");
  }
}

function sniff(b: Uint8Array): string | null {
  const is = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (is(0x89, 0x50, 0x4e, 0x47)) return "png";
  if (is(0xff, 0xd8, 0xff)) return "jpg";
  if (is(0x47, 0x49, 0x46, 0x38)) return "gif";
  if (is(0x67, 0x6c, 0x54, 0x46)) return "glb"; // "glTF"
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69) return "avif"; // ftypavi
  return null;
}
