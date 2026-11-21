import type { Metadata } from "next";
import { BlogCard, FeaturedCard } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { Pagination } from "@/components/blog/Pagination";
import s from "@/components/blog/blog.module.css";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { getBlogIndex } from "@/lib/db/posts";

export const metadata: Metadata = {
  title: "AI Daily Blog",
  description: "One new fan note every day: recaps, trivia and listening guides.",
};

type Search = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BlogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tag = first(sp.tag) || undefined;
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const { featured, items, tags, page, pageCount, publishedAt } = await getBlogIndex({ tag, q, page: Number(first(sp.page)) });

  return (
    <>
      <section className={s.head}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <span className="floaty" style={{ position: "absolute", left: "10%", top: "36%" }}><HeartIcon size={30} fill="#FFB6D5" /></span>
          <span className="floaty" style={{ position: "absolute", right: "14%", top: "26%", animationDelay: "-2s" }}><HeartIcon size={20} fill="#A8D8FF" /></span>
          <div style={{ position: "absolute", width: 520, height: 520, left: -160, top: -280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,182,213,.55), rgba(255,182,213,0) 70%)" }} />
        </div>
        <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 className="disp holo-text" style={{ margin: 0, fontSize: "clamp(44px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>AI Daily Blog</h1>
          <p style={{ margin: 0, fontSize: 17, color: "var(--ink-500)" }}>One new fan note every day: recaps, trivia and listening guides.</p>
        </div>
      </section>

      <div className={s.wrap}>
        <div role="note" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 16, background: "#2B2440", color: "#fff", fontSize: 15 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}><path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" fill="#FFB6D5" /></svg>
          <span><strong>Every post here is written by AI</strong> · fan content, not official. Posts use verified facts only and never quote the members.</span>
        </div>
      </div>

      <div className={`${s.wrap} ${s.body}`}>
        {featured ? <FeaturedCard post={featured} /> : <div className={s.empty}>No posts yet. The first fan note lands soon.</div>}
        {featured && (
          <>
            <BlogFilters tags={tags} activeTag={tag} q={q} />
            <div className={s.layout}>
              <div className={s.list}>
                {items.length > 0 ? (
                  <div className={s.grid}>{items.map((p) => <BlogCard key={p.slug} post={p} />)}</div>
                ) : (
                  <div className={s.empty}>No posts match. Try another tag or search word.</div>
                )}
                <Pagination page={page} pageCount={pageCount} tag={tag} q={q} />
              </div>
              <BlogSidebar featured={featured} tags={tags} publishedAt={publishedAt} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
