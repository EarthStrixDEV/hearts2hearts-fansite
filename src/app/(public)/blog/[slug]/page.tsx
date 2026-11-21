import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiBadge, BlogCard } from "@/components/blog/BlogCard";
import { ArticleToc } from "@/components/blog/ArticleToc";
import { fmtDate, tagBg } from "@/components/blog/format";
import { ArticleBody, getHeadings } from "@/components/blog/markdown";
import s from "@/components/blog/blog.module.css";
import { getPost, getPostSlugs } from "@/lib/db/posts";

// Time-based visibility (published_at <= now) needs a bounded staleness window on top of tag revalidation.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await getPost((await params).slug);
  if (!data) return {};
  return { title: data.post.title, description: data.post.excerpt ?? undefined };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await getPost((await params).slug);
  if (!data) notFound();
  const { post, related, prev, next } = data;
  const headings = getHeadings(post.body_md);

  return (
    <article>
      <div className={s.postHero} style={{ background: post.grad }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0), var(--cream-50))" }} />
      </div>

      <div className={s.wrap} style={{ maxWidth: 840, marginTop: -96, position: "relative" }}>
        <div className="glass" style={{ borderRadius: 24, padding: "28px clamp(20px, 4vw, 36px)", display: "flex", flexDirection: "column", gap: 14 }}>
          <Link href="/blog" className="fx" style={{ fontSize: 14, fontWeight: 500, textDecoration: "none", alignSelf: "flex-start" }}>← All posts</Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {post.tags.map((t) => (
              <Link key={t.slug} href={`/blog?tag=${t.slug}`} className={`chip ${s.tagLink}`} style={{ background: tagBg(t.slug) }}>{t.name}</Link>
            ))}
            {post.source === "ai" && <AiBadge />}
          </div>
          <h1 className="disp" style={{ margin: 0, fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.01em" }}>{post.title}</h1>
          {post.excerpt && <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "var(--ink-500)" }}>{post.excerpt}</p>}
          <span className={s.note}>
            {fmtDate(post.published_at)} · {post.read_min} min read{post.source === "ai" ? " · written by AI, fan content" : ""}
          </span>
        </div>
      </div>

      <div className={`${s.wrap} ${s.body}`} style={{ gap: 56 }}>
        <div className={s.postLayout}>
          <ArticleToc headings={headings} />
          <ArticleBody markdown={post.body_md} />
        </div>

        {post.source === "ai" && (
          <div role="note" style={{ maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 16, background: "#2B2440", color: "#fff", fontSize: 14, lineHeight: 1.5 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}><path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" fill="#FFB6D5" /></svg>
            <span>Written by AI · fan content, not official. Posts use verified facts only and never quote the members.</span>
          </div>
        )}

        {related.length > 0 && (
          <section aria-labelledby="rel" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 id="rel" className="disp" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Related posts</h2>
            <div className={s.related}>{related.map((p) => <BlogCard key={p.slug} post={p} />)}</div>
          </section>
        )}

        {(prev || next) && (
          <nav aria-label="More posts" className={s.prevNext}>
            {prev ? (
              <Link href={`/blog/${prev.slug}`} rel="prev" className="glass card-l fx" style={{ borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "var(--ink-900)" }}>
                <span className="lbl">← Older</span>
                <span className="disp clamp2" style={{ fontSize: 18, fontWeight: 600 }}>{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/blog/${next.slug}`} rel="next" className="glass card-l fx" style={{ borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "var(--ink-900)", textAlign: "right" }}>
                <span className="lbl">Newer →</span>
                <span className="disp clamp2" style={{ fontSize: 18, fontWeight: 600 }}>{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </article>
  );
}
