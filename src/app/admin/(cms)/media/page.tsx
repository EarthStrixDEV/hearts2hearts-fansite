import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { DeleteForm } from "@/components/admin/SaveBar";
import { UploadButton } from "@/components/admin/UploadButton";
import { Badge, Field, PageHead, SearchForm, Seg, type Tone } from "@/components/admin/ui";
import { deleteMedia, updateMedia } from "@/lib/admin/actions/media";
import { getAdminContext } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { fmtDateTime } from "@/lib/admin/form";
import { signedUrls } from "@/lib/admin/mediaUrl";
import { getMedia, listMedia, mediaUsage } from "@/lib/admin/queries/media";
import { href } from "@/lib/admin/url";
import type { Media } from "@/lib/db/types";

export const metadata = { title: "Media" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = [["all", "All"], ["images", "Images"], ["noalt", "Missing alt"]] as const;
const isImage = (m: Media) => m.mime_type.startsWith("image/");
const fileName = (m: Media) => m.path.split("/").pop() ?? m.path;
const state = (m: Media): { label: string; tone: Tone } =>
  isImage(m) && !(m.alt ?? "").trim() ? { label: "Alt text missing", tone: "warn" } : { label: "Ready", tone: "ok" };

export default async function AdminMedia({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q), f = one(sp.f) ?? "all", id = one(sp.id);
  const ctx = await getAdminContext();
  const [rows, sel, usage] = await Promise.all([listMedia(q, f), id ? getMedia(id) : null, mediaUsage()]);
  const urls = await signedUrls([...rows.filter(isImage).map((m) => m.path), sel && isImage(sel) ? sel.path : null]);
  const attn = rows.filter((m) => state(m).tone !== "ok").length;
  const used = sel ? usage.get(sel.id) ?? [] : [];
  const keep = { q, f: f === "all" ? undefined : f };

  return (
    <>
      <PageHead
        title="Media library"
        desc="Files are hosted on the fan site itself. Don’t hotlink images from official sites or socials."
        actions={<UploadButton disabled={!ctx.configured} />}
      />
      <div className="a-cluster" style={{ justifyContent: "space-between" }}>
        <Seg label="File type" items={FILTERS.map(([k, l]) => ({ label: l, on: f === k, href: href("/admin/media", { q, f: k === "all" ? undefined : k }) }))} />
        <SearchForm q={q} hidden={{ f: keep.f }} placeholder="Search files" />
        <Badge tone={attn ? "warn" : "ok"}>{attn} need attention</Badge>
      </div>

      <div className="a-split">
        <section aria-label="Files" className="a-grow">
          <div className="a-tiles">
            {rows.map((m) => {
              const s = state(m);
              const url = isImage(m) ? urls.get(m.path) : null;
              return (
                <Link key={m.id} href={href("/admin/media", { ...keep, id: m.id })} className={m.id === id ? "a-tile on" : "a-tile"} aria-current={m.id === id ? "true" : undefined} scroll={false}>
                  <span className="a-thumb a-sq">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {url ? <img src={url} alt="" loading="lazy" /> : <span>{isImage(m) ? "Preview unavailable" : "3D model"}</span>}
                  </span>
                  <span className="a-mono" style={{ fontSize: 12, overflowWrap: "anywhere" }}>{fileName(m)}</span>
                  <span className="a-cluster" style={{ gap: 6 }}>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className="a-sub" style={{ fontSize: 12 }}>{m.width && m.height ? `${m.width}×${m.height}` : m.mime_type.split("/")[1]}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          {rows.length === 0 && <p className="a-empty a-card">{ctx.configured ? "No files here yet. Upload some to get started." : "No data yet. Connect the database to manage media."}</p>}
        </section>

        {sel ? (
          <section className="a-card a-pad a-aside" aria-labelledby="mh" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="a-row">
              <h2 id="mh" className="a-mono" style={{ fontSize: 15, fontWeight: 500, overflowWrap: "anywhere" }}>{fileName(sel)}</h2>
              <Link href={href("/admin/media", keep)} className="a-ibtn" aria-label="Close details">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </Link>
            </div>
            <span className="a-thumb a-sq" style={{ aspectRatio: sel.width && sel.height ? `${sel.width} / ${sel.height}` : "16 / 9", maxHeight: 320 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {isImage(sel) && urls.get(sel.path) ? <img src={urls.get(sel.path)!} alt={sel.alt ?? ""} style={{ objectFit: "contain" }} /> : <span>{isImage(sel) ? "Preview unavailable" : "3D model"}</span>}
            </span>
            <div className="a-cluster">
              <Badge tone={state(sel).tone}>{state(sel).label}</Badge>
              <span className="a-sub">{sel.width && sel.height ? `${sel.width}×${sel.height} · ` : ""}{sel.mime_type} · {fmtDateTime(sel.created_at)}</span>
            </div>
            <ActionForm key={`${sel.id}:${sel.alt}:${sel.credit}`} action={updateMedia} readOnly={!ctx.configured} className="a-stack">
              <input type="hidden" name="id" value={sel.id} />
              <input type="hidden" name="require_alt" value={isImage(sel) ? "1" : ""} />
              <Field label={isImage(sel) ? "Alt text *" : "Alt text"} hint="What’s in the image, in one sentence. Name a member only if the source says who it is. Don’t guess.">
                <textarea name="alt" defaultValue={sel.alt ?? ""} className={`a-inp${isImage(sel) && !(sel.alt ?? "").trim() ? " req" : ""}`} />
              </Field>
              <Field label="Credit" hint="Photographer, designer or Fan Hub."><input name="credit" defaultValue={sel.credit ?? ""} className="a-inp" /></Field>
              <div className="a-fld">
                <span className="a-lbl">Used in</span>
                {used.length ? (
                  <span className="a-cluster" style={{ gap: 6 }}>{used.map((u, i) => <Link key={i} href={u.href} className="a-chip">{u.label}</Link>)}</span>
                ) : <span className="a-hint">Not used on any page yet.</span>}
              </div>
              <div className="a-foot"><SubmitButton variant="primary">Save</SubmitButton></div>
            </ActionForm>
            {used.length ? <span className="a-hint">To delete this file, take it off the pages above first.</span> : <DeleteForm action={deleteMedia} id={sel.id} what="file" readOnly={!ctx.configured} />}
          </section>
        ) : (
          <section className="a-card a-aside a-empty" style={{ padding: 28 }}>Select a file to edit its alt text and credit.</section>
        )}
      </div>
    </>
  );
}
