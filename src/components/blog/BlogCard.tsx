import Link from "next/link";
import type { PostCardData } from "@/lib/db/posts";
import { CoverLayer } from "@/components/ui/CoverLayer";
import { fmtDate, tagBg } from "./format";
import s from "./blog.module.css";

export function AiBadge({ size = 11, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`chip ${className ?? ""}`} style={{ background: "#2B2440", color: "#fff", ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" fill="#FFB6D5" />
      </svg>
      AI
    </span>
  );
}

export function BlogCard({ post }: { post: PostCardData }) {
  const tag = post.tags[0];
  return (
    <Link href={`/blog/${post.slug}`} className={`card-l glass fx ${s.card}`}>
      <span style={{ display: "block", position: "relative", aspectRatio: "16 / 9", overflow: "hidden" }}>
        <span className="zoom" style={{ position: "absolute", inset: 0, display: "block" }}><CoverLayer src={post.cover} grad={post.grad} /></span>
        {post.source === "ai" && <AiBadge size={10} style={{ position: "absolute", top: 10, right: 10 }} />}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 18px 18px" }}>
        {tag && <span style={{ display: "flex", gap: 6 }}><span className="chip" style={{ background: tagBg(tag.slug), color: "#2B2440" }}>{tag.name}</span></span>}
        <span className="disp clamp2" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.25 }}>{post.title}</span>
        {post.excerpt && <span className="clamp3" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-500)" }}>{post.excerpt}</span>}
        <span className={s.note} style={{ fontSize: 12 }}>{fmtDate(post.published_at)} · {post.read_min} min read</span>
      </span>
    </Link>
  );
}

export function FeaturedCard({ post }: { post: PostCardData }) {
  const tag = post.tags[0];
  return (
    <Link href={`/blog/${post.slug}`} className={`card-l glass fx ${s.card} ${s.featured}`}>
      <span style={{ flex: "1 1 420px", minHeight: 300, position: "relative", overflow: "hidden", display: "block" }}>
        <span className="zoom" style={{ position: "absolute", inset: 0, display: "block" }}><CoverLayer src={post.cover} grad={post.grad} /></span>
        <span className="chip" style={{ position: "absolute", top: 16, left: 16, background: "#FF8FB8", color: "#2B2440" }}>Today’s post</span>
        {post.source === "ai" && <AiBadge style={{ position: "absolute", top: 16, right: 16 }} />}
      </span>
      <span style={{ flex: "1 1 380px", padding: 32, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
        {tag && <span style={{ display: "flex", gap: 6 }}><span className="chip" style={{ background: tagBg(tag.slug), color: "#2B2440" }}>{tag.name}</span></span>}
        <span className="disp" style={{ fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 600, lineHeight: 1.15 }}>{post.title}</span>
        {post.excerpt && <span style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-500)" }}>{post.excerpt}</span>}
        <span className={s.note}>
          {fmtDate(post.published_at)} · {post.read_min} min read{post.source === "ai" ? " · written by AI, fan content" : ""}
        </span>
      </span>
    </Link>
  );
}
