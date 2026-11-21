import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { DeleteForm, SaveBar } from "@/components/admin/SaveBar";
import { Badge, Field, MediaSelect, PageHead, SearchForm, Seg, type Tone } from "@/components/admin/ui";
import { deletePost, savePost, setPostState } from "@/lib/admin/actions/posts";
import { getAdminContext } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { fmtDateTime, PUBLISH_TZ, utcToZonedLocal } from "@/lib/admin/form";
import { signedUrls } from "@/lib/admin/mediaUrl";
import { mediaOptions, mediaPaths } from "@/lib/admin/queries/media";
import { listMembers } from "@/lib/admin/queries/members";
import { getPost, listPosts, POST_TABS, postTab, type PostTab } from "@/lib/admin/queries/posts";
import { href } from "@/lib/admin/url";

export const metadata = { title: "AI Blog" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const STATE: Record<PostTab, { label: string; tone: Tone }> = {
  draft: { label: "Needs review", tone: "warn" },
  scheduled: { label: "Scheduled", tone: "acc" },
  published: { label: "Published", tone: "ok" },
  archived: { label: "Rejected", tone: "bad" },
};

export default async function AdminPosts({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q), id = one(sp.id), isNew = one(sp.new) === "1", editing = isNew || one(sp.edit) === "1";
  const tabParam = one(sp.tab);
  const ctx = await getAdminContext();
  const all = await listPosts(q);

  const tab: PostTab = (POST_TABS.find((t) => t.key === tabParam)?.key) ?? (id ? all.find((p) => p.id === id)?.tab : undefined) ?? "draft";
  const items = all.filter((p) => p.tab === tab);
  const selId = isNew ? undefined : id ?? items[0]?.id;
  const [post, media, members] = await Promise.all([selId ? getPost(selId) : null, mediaOptions(), editing ? listMembers() : []]);
  const coverKey = (await mediaPaths([post?.cover_id])).get(post?.cover_id ?? "");
  const coverUrl = coverKey ? (await signedUrls([coverKey])).get(coverKey) : undefined;
  const cur = post ? postTab(post) : undefined;
  const paras = (post?.body_md ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const keep = { q };

  const checks = post
    ? [
        { label: "Title and body written", ok: !!post.title && paras.length > 0 },
        { label: "Excerpt for the blog list", ok: !!post.excerpt?.trim() },
        { label: "Cover image set", ok: !!post.cover_id },
        { label: "Tags added", ok: post.tag_names.length > 0 },
      ]
    : [];

  return (
    <>
      <PageHead
        title="AI Blog"
        desc="The AI writes a draft each day. Nothing goes live until a person checks every fact."
        actions={
          <>
            <Link href="/admin/settings" className="a-btn">Generator settings</Link>
            <Link href={href("/admin/posts", { ...keep, new: "1" })} className="a-btn a-btn-p" aria-disabled={!ctx.configured}>New post</Link>
          </>
        }
      />
      <SearchForm q={q} hidden={{ tab }} placeholder="Search posts" />

      <div className="a-split">
        {/* LIST */}
        <section className="a-card" aria-label="Posts" style={{ flex: "1 1 280px", maxWidth: 360, minWidth: 0, overflow: "hidden" }}>
          <div style={{ padding: 10 }}>
            <Seg label="Status" items={POST_TABS.map((t) => ({ label: `${t.label} · ${all.filter((p) => p.tab === t.key).length}`, on: tab === t.key, href: href("/admin/posts", { ...keep, tab: t.key }) }))} />
          </div>
          {items.map((p) => (
            <Link key={p.id} href={href("/admin/posts", { ...keep, tab, id: p.id })} className={p.id === selId && !isNew ? "a-item on" : "a-item"}>
              <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{p.title}</span>
              <span className="a-cluster" style={{ gap: 6 }}>
                {p.tag_names[0] && <Badge>{p.tag_names[0]}</Badge>}
                <Badge tone={STATE[p.tab].tone}>{STATE[p.tab].label}</Badge>
              </span>
              <span className="a-sub" style={{ fontSize: 12 }}>
                {p.tab === "draft" || p.tab === "archived" ? `${p.source === "ai" ? "AI draft" : "Draft"} · ${fmtDateTime(p.created_at)}` : `${p.tab === "scheduled" ? "Scheduled" : "Published"} · ${fmtDateTime(p.published_at)}`}
              </span>
            </Link>
          ))}
          {items.length === 0 && <p className="a-empty" style={{ fontSize: 13 }}>{ctx.configured ? "Nothing here yet." : "No data yet. Connect the database."}</p>}
        </section>

        {/* PREVIEW or EDIT FORM */}
        <section className="a-card" aria-label={editing ? "Edit post" : "Preview"} style={{ flex: "999 1 420px", minWidth: 0, overflow: "hidden" }}>
          {editing ? (
            <ActionForm key={`${post?.id ?? "new"}:${post?.updated_at ?? ""}`} action={savePost} readOnly={!ctx.configured} className="a-stack">
              <div className="a-pad a-stack">
                <h2 className="a-h2">{post ? "Edit post" : "New post"}</h2>
                <input type="hidden" name="id" value={post?.id ?? ""} />
                <Field label="Title *"><input name="title" required defaultValue={post?.title} className="a-inp" /></Field>
                <Field label="Excerpt" hint="Shown on the blog list and in link previews."><textarea name="excerpt" defaultValue={post?.excerpt ?? ""} className="a-inp" rows={2} /></Field>
                <Field label="Body (Markdown)"><textarea name="body_md" defaultValue={post?.body_md ?? ""} className="a-inp a-mono" rows={14} /></Field>
                <div className="a-g2">
                  <Field label="Tags" hint="Comma separated."><input name="tags" defaultValue={post?.tag_names.join(", ") ?? ""} className="a-inp" /></Field>
                  <Field label="Member"><select name="member_id" defaultValue={post?.member_id ?? ""} className="a-inp"><option value="">None</option>{members.map((m) => <option key={m.id} value={m.id}>{m.stage_name}</option>)}</select></Field>
                  <MediaSelect name="cover_id" label="Cover" value={post?.cover_id} options={media} />
                  <Field label={`Publish at (${PUBLISH_TZ})`} hint="Blank = now. A future time schedules the post."><input name="publish_at" type="datetime-local" defaultValue={utcToZonedLocal(post?.published_at, PUBLISH_TZ)} className="a-inp" /></Field>
                  <Field label="Slug" hint="Blank = generated from the title." className="a-full"><input name="slug" defaultValue={post?.slug ?? ""} className="a-inp a-mono" /></Field>
                </div>
                <SaveBar status={post?.status} isNew={!post} previewHref={cur === "published" && post ? `/blog/${post.slug}` : null} />
                {post && <Link href={href("/admin/posts", { ...keep, tab, id: post.id })} className="a-sub">Cancel editing</Link>}
              </div>
            </ActionForm>
          ) : post ? (
            <>
              <div className="a-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {coverUrl ? <img src={coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                {post.source === "ai" && <span className="a-badge" style={{ position: "absolute", top: 14, right: 14, background: "#1c1b22", color: "#fff" }}>Written by AI · fan content, not official</span>}
                {!post.cover_id && <span className="a-badge" style={{ position: "absolute", left: 14, bottom: 14, background: "rgba(255,255,255,.9)", color: "#1c1b22" }}>Cover · TODO</span>}
              </div>
              <article className="a-article">
                {post.tag_names.length > 0 && <span className="a-cluster">{post.tag_names.map((t) => <Badge key={t}>{t}</Badge>)}</span>}
                <h2>{post.title}</h2>
                {post.excerpt && <p className="a-sub" style={{ fontSize: 15 }}>{post.excerpt}</p>}
                {paras.map((p, i) => <p key={i}>{p}</p>)}
                {paras.length === 0 && <p className="a-sub">This post has no body yet.</p>}
                <p className="a-sub" style={{ fontSize: 13 }}>Plain-text preview. Markdown renders on the live site.</p>
              </article>
            </>
          ) : (
            <p className="a-empty">{id ? "That post no longer exists." : "Select a post to preview it."}</p>
          )}
        </section>

        {/* REVIEW */}
        <section className="a-card a-pad" aria-labelledby="rv" style={{ flex: "1 1 300px", maxWidth: 380, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="a-row"><h2 id="rv" style={{ fontSize: 16, fontWeight: 600 }}>Review</h2>{cur ? <Badge tone={STATE[cur].tone}>{STATE[cur].label}</Badge> : <Badge>—</Badge>}</div>
          {post && !editing ? (
            <>
              <div className="a-stack-s">
                <span className="a-section-lbl">Checklist</span>
                {post.source === "ai" && <div className="a-check-row"><Badge tone="ok">✓</Badge>Shown with the “Written by AI” label</div>}
                {checks.map((c) => <div key={c.label} className="a-check-row"><Badge tone={c.ok ? "ok" : "warn"}>{c.ok ? "✓" : "!"}</Badge>{c.label}</div>)}
                <span className="a-hint">Check every fact against official sources before approving. AI never publishes on its own.</span>
              </div>
              <ActionForm key={`${post.id}:${post.updated_at}`} action={setPostState} readOnly={!ctx.configured} className="a-stack">
                <input type="hidden" name="id" value={post.id} />
                {cur !== "published" && (
                  <Field label={`Publish at (${PUBLISH_TZ})`} hint="Blank = publish now.">
                    <input name="publish_at" type="datetime-local" defaultValue={utcToZonedLocal(post.published_at, PUBLISH_TZ)} className="a-inp" />
                  </Field>
                )}
                {(cur === "draft" || cur === "archived") && <SubmitButton intent="publish" variant="primary">Approve &amp; schedule</SubmitButton>}
                <div className="a-cluster" style={{ flexWrap: "nowrap" }}>
                  <Link href={href("/admin/posts", { ...keep, tab, id: post.id, edit: "1" })} className="a-btn" style={{ flex: 1 }}>Edit</Link>
                  {cur !== "archived" && <SubmitButton intent="archive" variant="danger" className="" >{cur === "draft" ? "Reject" : "Archive"}</SubmitButton>}
                </div>
                {cur !== "draft" && <SubmitButton intent="draft">Move back to drafts</SubmitButton>}
              </ActionForm>
              <DeleteForm action={deletePost} id={post.id} what="post" readOnly={!ctx.configured} />
            </>
          ) : (
            <p className="a-sub">{editing ? "Save the post as a draft or publish it from the form." : "Select a post to review it."}</p>
          )}
        </section>
      </div>
    </>
  );
}
