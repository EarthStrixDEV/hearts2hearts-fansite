import type { Heading } from "./markdown";
import s from "./blog.module.css";

/** Sticky "on this page" list (hidden below 1000px). Anchors match the ids ArticleBody puts on headings. */
export function ArticleToc({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;
  return (
    <nav aria-label="On this page" className={s.toc}>
      <span className="lbl">On this page</span>
      {headings.map((h) => (
        <a key={h.id} href={`#${h.id}`} className={`fx ${s.tocLink}`} style={{ paddingLeft: h.level === 3 ? 14 : 0 }}>
          {h.text}
        </a>
      ))}
    </nav>
  );
}
