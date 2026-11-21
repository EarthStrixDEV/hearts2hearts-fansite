"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { adminToast } from "./toast";

function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** Posts each file to /admin/media/upload (server validates type + size and writes to the private bucket). */
export function UploadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    let done = 0;
    let lastError = "";
    let lastId: string | undefined;
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      const dims = f.type.startsWith("image/") ? await imageSize(f) : null;
      if (dims) { fd.append("width", String(dims.w)); fd.append("height", String(dims.h)); }
      try {
        const res = await fetch("/admin/media/upload", { method: "POST", body: fd });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string } | null;
        if (res.ok && json?.ok) { done++; lastId = json.id; } else lastError = json?.error ?? `Upload failed (${res.status}).`;
      } catch {
        lastError = "Upload failed. Check your connection.";
      }
    }
    setBusy(false);
    if (done) {
      adminToast(`${done} ${done > 1 ? "files" : "file"} uploaded. Add alt text and a credit.`, true);
      router.push(lastId ? `/admin/media?id=${lastId}` : "/admin/media");
      router.refresh();
    }
    if (lastError) adminToast(lastError, false);
  }

  return (
    <label className="a-btn a-btn-p" style={{ position: "relative", overflow: "hidden", opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : undefined }} aria-disabled={disabled}>
      {busy ? "Uploading…" : "Upload files"}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,.glb" multiple disabled={disabled || busy} onChange={onChange} className="a-vh" />
    </label>
  );
}
