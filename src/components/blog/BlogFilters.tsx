import Link from "next/link";
import type { PostTagRef } from "@/lib/db/posts";
import { blogHref } from "./format";
import s from "./blog.module.css";

/** Tag filter (links) + search (plain GET form). Both work without JavaScript and reset to page 1. */
export function BlogFilters({ tags, activeTag, q }: { tags: PostTagRef[]; activeTag?: string; q?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <nav aria-label="Filter by tag" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link href={blogHref({ q })} className={s.seg} aria-current={!activeTag ? "true" : undefined}>All</Link>
        {tags.map((t) => (
          <Link key={t.slug} href={blogHref({ tag: t.slug, q })} className={s.seg} aria-current={activeTag === t.slug ? "true" : undefined}>
            {t.name}
          </Link>
        ))}
      </nav>
      <form action="/blog" role="search">
        {activeTag && <input type="hidden" name="tag" value={activeTag} />}
        <label className={s.search}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ color: "var(--ink-500)" }}>
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">Search posts</span>
          <input type="search" name="q" placeholder="Search posts" defaultValue={q} />
        </label>
      </form>
    </div>
  );
}
