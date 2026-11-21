import Link from "next/link";
import type { PostCardData, PostTagRef } from "@/lib/db/posts";
import { blogHref, kstParts, tagBg } from "./format";
import s from "./blog.module.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Month of the newest post: pink days have a post, dark day is today (when it falls in that month). */
function Calendar({ publishedAt, anchor }: { publishedAt: string[]; anchor: string }) {
  const { y, m } = kstParts(anchor);
  const today = kstParts(Date.now());
  const days = new Set(publishedAt.map(kstParts).filter((p) => p.y === y && p.m === m).map((p) => p.d));
  const lead = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  return (
    <div className="glass" style={{ borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{MONTHS[m]} {y}</span>
      <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2, fontSize: 11, color: "var(--ink-500)", textAlign: "center" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2 }}>
        {cells.map((d, i) => {
          const isToday = d !== null && today.y === y && today.m === m && today.d === d;
          const has = d !== null && days.has(d);
          return (
            <span key={i} className={s.cday} style={{ background: isToday ? "#2B2440" : has ? "rgba(255,143,184,.25)" : "transparent", color: isToday ? "#fff" : "inherit", fontWeight: has ? 600 : 400 }}
              aria-label={d !== null && has ? `${MONTHS[m]} ${d}, has a post` : undefined}>
              {d}
            </span>
          );
        })}
      </div>
      <span className={s.note} style={{ fontSize: 12 }}>Pink days have a post.</span>
    </div>
  );
}

export function BlogSidebar({
  featured,
  tags,
  publishedAt,
}: {
  featured: PostCardData | null;
  tags: (PostTagRef & { count: number })[];
  publishedAt: string[];
}) {
  return (
    <aside className={s.side} aria-label="Blog sidebar">
      {featured && <Calendar publishedAt={publishedAt} anchor={featured.published_at} />}
      {tags.length > 0 && (
        <div className="glass" style={{ borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>Popular tags</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tags.map((t) => (
              <Link key={t.slug} href={blogHref({ tag: t.slug })} className={`chip ${s.tagLink}`} style={{ background: tagBg(t.slug) }}>
                {t.name} · {t.count}
              </Link>
            ))}
          </div>
        </div>
      )}
      {featured && (
        <div style={{ borderRadius: 20, padding: 18, background: "var(--holo)", color: "#2B2440", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>Today’s post</span>
          <span className="disp" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>{featured.title}</span>
          <Link className="fx" href={`/blog/${featured.slug}`} style={{ fontSize: 14, fontWeight: 600, color: "#2B2440" }}>Read now →</Link>
        </div>
      )}
    </aside>
  );
}
