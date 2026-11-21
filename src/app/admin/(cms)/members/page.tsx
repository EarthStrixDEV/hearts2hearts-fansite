import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { DeleteForm, SaveBar } from "@/components/admin/SaveBar";
import { Badge, Field, MediaSelect, PageHead, SearchForm, Seg, StatusBadge } from "@/components/admin/ui";
import { deleteMember, saveMember } from "@/lib/admin/actions/members";
import { getAdminContext } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { fmtDate } from "@/lib/admin/form";
import { mediaOptions } from "@/lib/admin/queries/media";
import { getMember, listMembers, memberCompleteness } from "@/lib/admin/queries/members";
import { href } from "@/lib/admin/url";

export const metadata = { title: "Members" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMembers({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q), status = one(sp.status) ?? "all", id = one(sp.id), isNew = one(sp.new) === "1";
  const ctx = await getAdminContext();
  const [rows, selected, media] = await Promise.all([listMembers(q, status), id ? getMember(id) : null, mediaOptions()]);
  const m = selected?.member;
  const showForm = isNew || !!m;
  const keep = { q, status: status === "all" ? undefined : status };
  const factsText = (selected?.facts ?? []).map((f) => `${f.label}: ${f.value}`).join("\n");

  return (
    <>
      <PageHead
        title="Members"
        desc="Profiles shown on /members. Publish to make a profile public; the line-up itself comes from official announcements."
        actions={<Link href={href("/admin/members", { ...keep, new: "1" })} className="a-btn a-btn-p" aria-disabled={!ctx.configured}>Add member</Link>}
      />
      <div className="a-cluster" style={{ justifyContent: "space-between" }}>
        <Seg label="Status" items={[["all", "All"], ["published", "Published"], ["draft", "Drafts"], ["archived", "Archived"]].map(([k, l]) => ({ label: l, on: status === k, href: href("/admin/members", { q, status: k === "all" ? undefined : k }) }))} />
        <SearchForm q={q} hidden={{ status: keep.status }} placeholder="Search members" />
      </div>

      <div className="a-split">
        <section className="a-card a-scroll a-grow" aria-label="Member list">
          <table className="a-tbl">
            <thead><tr><th scope="col">Member</th><th scope="col">Birthday</th><th scope="col">Position</th><th scope="col">Complete</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const c = memberCompleteness(r, r.fact_count);
                return (
                  <tr key={r.id} className={r.id === id ? "sel" : undefined}>
                    <td>
                      <Link href={href("/admin/members", { ...keep, id: r.id })} className="a-rowlink" aria-label={`Edit ${r.stage_name}`}>
                        <span className="a-swatch" style={{ background: r.color_hex }} />
                        <span style={{ display: "flex", flexDirection: "column" }}>
                          <span>{r.stage_name}</span>
                          <span className="a-sub" style={{ fontSize: 12, fontWeight: 400 }}>{r.name_ko ?? ""}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="a-mono" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{fmtDate(r.birth_date)}</td>
                    <td>{r.position?.join(" · ") || <span className="a-sub">—</span>}</td>
                    <td><span className="a-cluster" style={{ flexWrap: "nowrap" }}><span className="a-bar" aria-hidden="true"><span style={{ width: `${(c.filled / c.total) * 100}%` }} /></span><span className="a-mono a-sub" style={{ fontSize: 12 }}>{c.filled}/{c.total}</span></span></td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="a-empty">{ctx.configured ? "No members match. Add one to get started." : "No data yet. Connect the database to manage members."}</p>}
        </section>

        <section className="a-card a-pad a-aside" aria-labelledby="ed" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!showForm ? (
            <p className="a-empty" style={{ padding: 8 }}>{id ? "That member no longer exists." : "Select a member to edit, or add a new one."}</p>
          ) : (
            <>
              <div className="a-cluster" style={{ flexWrap: "nowrap", gap: 12 }}>
                <span className="a-swatch" style={{ width: 56, height: 56, borderRadius: 12, background: m?.color_hex ?? "#F9A8D4" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 id="ed" className="a-h2 a-ellipsis">{m?.stage_name ?? "New member"}</h2>
                  <span className="a-sub">{m ? <>/members/<span className="a-mono">{m.slug}</span></> : "Draft until you publish"}</span>
                </div>
                {m ? <StatusBadge status={m.status} /> : <Badge tone="warn">New</Badge>}
              </div>
              <ActionForm key={`${m?.id ?? "new"}:${m?.updated_at ?? ""}`} action={saveMember} readOnly={!ctx.configured} className="a-stack">
                <input type="hidden" name="id" value={m?.id ?? ""} />
                <div className="a-g2">
                  <Field label="Stage name *"><input name="stage_name" required defaultValue={m?.stage_name} className="a-inp" /></Field>
                  <Field label="Native name"><input name="name_ko" defaultValue={m?.name_ko ?? ""} className="a-inp" lang="ko" /></Field>
                  <Field label="Birth name"><input name="real_name" defaultValue={m?.real_name ?? ""} className="a-inp" /></Field>
                  <Field label="Birthday"><input name="birth_date" type="date" defaultValue={m?.birth_date ?? ""} className="a-inp" /></Field>
                  <Field label="Position" hint="Comma separated, e.g. Leader, Vocal" className="a-full"><input name="position" defaultValue={m?.position?.join(", ") ?? ""} className="a-inp" /></Field>
                </div>
                <div className="a-fld">
                  <label className="a-lbl" htmlFor="f-color">Card color</label>
                  <span className="a-cluster" style={{ gap: 10 }}>
                    <input id="f-color" name="color_hex" type="color" defaultValue={m?.color_hex ?? "#F9A8D4"} className="a-color" />
                    <span className="a-hint">Accent for the profile hero and member card. Use the official color once one exists.</span>
                  </span>
                </div>
                <div className="a-g2">
                  <MediaSelect name="avatar_id" label="Avatar" value={m?.avatar_id} options={media} />
                  <MediaSelect name="cover_id" label="Cover" value={m?.cover_id} options={media} />
                  <Field label="Sort order" hint="Lower numbers come first on /members."><input name="sort_order" type="number" defaultValue={m?.sort_order ?? rows.length} className="a-inp" /></Field>
                  <Field label="Slug" hint="Blank = generated from the stage name."><input name="slug" defaultValue={m?.slug ?? ""} className="a-inp a-mono" /></Field>
                </div>
                <Field label="Bio"><textarea name="bio" defaultValue={m?.bio ?? ""} className="a-inp" /></Field>
                <Field label="Facts" hint="One per line as “Label: value”, e.g. “MBTI: ENFP”. Lines without a colon become “Fun fact”.">
                  <textarea name="facts" defaultValue={factsText} className="a-inp" rows={5} />
                </Field>
                <SaveBar status={m?.status} isNew={!m} previewHref={m?.status === "published" ? `/members/${m.slug}` : null} />
              </ActionForm>
              {m && <DeleteForm action={deleteMember} id={m.id} what="member" readOnly={!ctx.configured} />}
            </>
          )}
        </section>
      </div>
    </>
  );
}
