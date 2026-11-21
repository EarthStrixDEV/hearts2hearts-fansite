import Link from "next/link";
import { blogHref } from "./format";
import s from "./blog.module.css";

/** Page numbers to show: first, last and the current page ±1, with 0 marking a gap. */
function windowOf(page: number, count: number): number[] {
  const keep = [...new Set([1, page - 1, page, page + 1, count])].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  return keep.flatMap((n, i) => (i > 0 && n - keep[i - 1] > 1 ? [0, n] : [n]));
}

export function Pagination({ page, pageCount, tag, q }: { page: number; pageCount: number; tag?: string; q?: string }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => blogHref({ tag, q, page: p });
  return (
    <nav aria-label="Pagination" className={s.pager}>
      {page > 1 && <Link href={href(page - 1)} className={s.seg} rel="prev">← Prev</Link>}
      {windowOf(page, pageCount).map((n, i) =>
        n === 0 ? (
          <span key={`gap-${i}`} aria-hidden="true" style={{ alignSelf: "center", color: "var(--ink-500)" }}>…</span>
        ) : (
          <Link key={n} href={href(n)} className={s.seg} aria-current={n === page ? "true" : undefined} aria-label={`Page ${n}`}>{n}</Link>
        ),
      )}
      {page < pageCount && <Link href={href(page + 1)} className={s.seg} rel="next">Next →</Link>}
    </nav>
  );
}
