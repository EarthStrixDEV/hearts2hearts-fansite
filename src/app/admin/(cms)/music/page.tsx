import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { DeleteForm, SaveBar } from "@/components/admin/SaveBar";
import { TrackEditor } from "@/components/admin/TrackEditor";
import { Badge, Field, MediaSelect, PageHead, SearchForm, Seg, StatusBadge } from "@/components/admin/ui";
import { deleteAlbum, saveAlbum } from "@/lib/admin/actions/music";
import { getAdminContext } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { fmtDate, fmtDuration } from "@/lib/admin/form";
import { signedUrls } from "@/lib/admin/mediaUrl";
import { mediaOptions, mediaPaths } from "@/lib/admin/queries/media";
import { getAlbum, listAlbums } from "@/lib/admin/queries/music";
import { href } from "@/lib/admin/url";

export const metadata = { title: "Releases" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const TYPES = [["all", "All"], ["album", "Albums"], ["ep", "EPs"], ["single", "Singles"]] as const;
const TYPE_LABEL: Record<string, string> = { album: "Album", ep: "EP", single: "Single" };

export default async function AdminReleases({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q), type = one(sp.type) ?? "all", id = one(sp.id), isNew = one(sp.new) === "1";
  const ctx = await getAdminContext();
  const [rows, selected, media] = await Promise.all([listAlbums(q, type), id ? getAlbum(id) : null, mediaOptions()]);
  const coverKeys = await mediaPaths(rows.map((r) => r.cover_id));
  const covers = await signedUrls([...coverKeys.values()]);
  const a = selected?.album;
  const showForm = isNew || !!a;
  const keep = { q, type: type === "all" ? undefined : type };

  return (
    <>
      <PageHead
        title="Releases"
        desc="Albums, EPs and singles on /music. Track durations stay empty until checked against an official source."
        actions={<Link href={href("/admin/music", { ...keep, new: "1" })} className="a-btn a-btn-p" aria-disabled={!ctx.configured}>New release</Link>}
      />
      <div className="a-cluster" style={{ justifyContent: "space-between" }}>
        <Seg label="Type" items={TYPES.map(([k, l]) => ({ label: l, on: type === k, href: href("/admin/music", { q, type: k === "all" ? undefined : k }) }))} />
        <SearchForm q={q} hidden={{ type: keep.type }} placeholder="Search releases" />
      </div>

      <div className="a-split">
        <section className="a-card a-scroll a-grow" aria-label="Release list">
          <table className="a-tbl">
            <thead><tr><th scope="col">Release</th><th scope="col">Type</th><th scope="col">Date</th><th scope="col">Tracks</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const cover = covers.get(coverKeys.get(r.cover_id ?? "") ?? "");
                return (
                  <tr key={r.id} className={r.id === id ? "sel" : undefined}>
                    <td>
                      <Link href={href("/admin/music", { ...keep, id: r.id })} className="a-rowlink" aria-label={`Edit ${r.title}`}>
                        <span className="a-swatch" style={{ width: 40, height: 40, overflow: "hidden" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {cover ? <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                        </span>
                        {r.title}
                      </Link>
                    </td>
                    <td className="a-sub" style={{ whiteSpace: "nowrap" }}>{TYPE_LABEL[r.album_type] ?? r.album_type}</td>
                    <td className="a-mono" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{r.release_date ? fmtDate(r.release_date) : "Date TODO"}</td>
                    <td><Badge tone={r.track_count ? "neu" : "warn"}>{r.track_count} {r.track_count === 1 ? "track" : "tracks"}</Badge></td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="a-empty">{ctx.configured ? "No releases match. Add one to get started." : "No data yet. Connect the database to manage releases."}</p>}
        </section>

        <section className="a-card a-pad a-aside" aria-labelledby="ed" style={{ flexBasis: 420, display: "flex", flexDirection: "column", gap: 16 }}>
          {!showForm ? (
            <p className="a-empty" style={{ padding: 8 }}>{id ? "That release no longer exists." : "Select a release to edit, or add a new one."}</p>
          ) : (
            <>
              <div className="a-cluster" style={{ flexWrap: "nowrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 id="ed" className="a-h2 a-ellipsis">{a?.title || "Untitled release"}</h2>
                  <span className="a-sub">Cover: official artwork only, with credit</span>
                </div>
                {a ? <StatusBadge status={a.status} /> : <Badge tone="warn">New</Badge>}
              </div>
              <ActionForm key={`${a?.id ?? "new"}:${a?.updated_at ?? ""}`} action={saveAlbum} readOnly={!ctx.configured} className="a-stack">
                <input type="hidden" name="id" value={a?.id ?? ""} />
                <div className="a-g2">
                  <Field label="Title *" className="a-full"><input name="title" required defaultValue={a?.title} className="a-inp" /></Field>
                  <Field label="Type">
                    <select name="album_type" defaultValue={a?.album_type ?? "single"} className="a-inp">
                      <option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option>
                    </select>
                  </Field>
                  <Field label="Release date"><input name="release_date" type="date" defaultValue={a?.release_date ?? ""} className="a-inp" /></Field>
                  <Field label="Spotify album URL" className="a-full"><input name="spotify_url" type="url" defaultValue={a?.spotify_url ?? ""} placeholder="https://open.spotify.com/album/…" className="a-inp" /></Field>
                  <MediaSelect name="cover_id" label="Cover" value={a?.cover_id} options={media} />
                  <Field label="Slug" hint="Blank = generated from the title."><input name="slug" defaultValue={a?.slug ?? ""} className="a-inp a-mono" /></Field>
                </div>
                <Field label="Description"><textarea name="description" defaultValue={a?.description ?? ""} className="a-inp" /></Field>
                <div className="a-stack-s">
                  <span className="a-lbl">Tracklist</span>
                  <TrackEditor
                    initial={(selected?.tracks ?? []).map((t) => ({ id: t.id, title: t.title, duration: fmtDuration(t.duration_sec), title_track: t.is_title_track }))}
                  />
                  <span className="a-hint">Duration as m:ss. The star marks the title track. Order here is the track number on the site.</span>
                </div>
                <SaveBar status={a?.status} isNew={!a} previewHref={a?.status === "published" ? "/music" : null} />
              </ActionForm>
              {a && <DeleteForm action={deleteAlbum} id={a.id} what="release" readOnly={!ctx.configured} />}
            </>
          )}
        </section>
      </div>
    </>
  );
}
