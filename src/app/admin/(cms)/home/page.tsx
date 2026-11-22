import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { DeleteForm, SaveBar } from "@/components/admin/SaveBar";
import { Field, MediaSelect, PageHead, StatusBadge, Thumb } from "@/components/admin/ui";
import { deleteSlide, saveSlide } from "@/lib/admin/actions/home";
import { getAdminContext } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { signedUrls } from "@/lib/admin/mediaUrl";
import { listSlides } from "@/lib/admin/queries/home";
import { mediaOptions, mediaPaths } from "@/lib/admin/queries/media";
import { href } from "@/lib/admin/url";

export const metadata = { title: "Home hero" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminHome({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const id = one(sp.id), isNew = one(sp.new) === "1";
  const ctx = await getAdminContext();
  const [rows, media] = await Promise.all([listSlides(), mediaOptions()]);
  const paths = await mediaPaths(rows.map((r) => r.image_id));
  const urls = await signedUrls([...paths.values()]);
  const sel = id ? rows.find((r) => r.id === id) ?? null : null;
  const showForm = isNew || !!sel;

  return (
    <>
      <PageHead
        title="Home hero"
        desc="Slides in the big carousel on the home page, in order. Pick an image from the Media library (upload or paste an X image link)."
        actions={<Link href={href("/admin/home", { new: "1" })} className="a-btn a-btn-p" aria-disabled={!ctx.configured}>Add slide</Link>}
      />
      <div className="a-split">
        <section className="a-card a-scroll a-grow" aria-label="Slides" style={{ flexBasis: 560 }}>
          <table className="a-tbl">
            <thead><tr><th scope="col">Slide</th><th scope="col">Order</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === id ? "sel" : undefined}>
                  <td>
                    <Link href={href("/admin/home", { id: r.id })} className="a-rowlink" aria-label={`Edit ${r.headline ?? "slide"}`} style={{ gap: 12 }}>
                      <span style={{ width: 72, flex: "none" }}><Thumb url={urls.get(paths.get(r.image_id) ?? "")} ratio="wide" empty="No image" /></span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{r.headline ?? "(no headline)"}</span>
                        <span className="a-sub" style={{ fontSize: 12, fontWeight: 400 }}>{r.subline ?? ""}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="a-mono">{r.sort_order}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="a-empty">{ctx.configured ? "No slides yet. Without slides the home page shows its built-in placeholders." : "No data yet. Connect the database to manage the home page."}</p>}
        </section>

        <section className="a-card a-pad a-aside" aria-labelledby="sh" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!showForm ? (
            <p className="a-empty" style={{ padding: 8 }}>{id ? "That slide no longer exists." : "Select a slide to edit, or add a new one."}</p>
          ) : (
            <>
              <h2 id="sh" style={{ fontSize: 17, fontWeight: 600 }}>{sel ? "Edit slide" : "New slide"}</h2>
              <ActionForm key={sel?.id ?? "new"} action={saveSlide} readOnly={!ctx.configured} className="a-stack">
                <input type="hidden" name="id" value={sel?.id ?? ""} />
                <MediaSelect name="image_id" label="Image *" value={sel?.image_id} options={media} />
                <Field label="Headline (era name)"><input name="headline" defaultValue={sel?.headline ?? ""} className="a-inp" /></Field>
                <Field label="Subtitle" hint="One line, e.g. “Single · Feb 24, 2025”."><input name="subline" defaultValue={sel?.subline ?? ""} className="a-inp" /></Field>
                <Field label="Order" hint="Lower numbers come first."><input name="sort_order" type="number" defaultValue={sel?.sort_order ?? rows.length} className="a-inp" /></Field>
                <SaveBar status={sel?.status} isNew={!sel} previewHref={sel?.status === "published" ? "/" : null} />
              </ActionForm>
              {sel && <DeleteForm action={deleteSlide} id={sel.id} what="slide" readOnly={!ctx.configured} />}
            </>
          )}
        </section>
      </div>
    </>
  );
}
