import Link from "next/link";
import type { ReactNode } from "react";
import s from "./blog.module.css";

/**
 * Small safe markdown renderer (no dependency, no dangerouslySetInnerHTML): headings, paragraphs, bullet/numbered
 * lists, blockquotes, fenced code, hr, and inline `code`, **bold**, *italic*, [links](url). Raw HTML is never parsed;
 * everything is rendered as React text. Link targets are limited to http(s), mailto and site-relative paths.
 */
type Block =
  | { t: "h"; level: 2 | 3 | 4; id: string; text: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "code"; text: string }
  | { t: "hr" };

export interface Heading { id: string; text: string; level: 2 | 3 | 4 }

const slugify = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const seen = new Map<string, number>();
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      i++;
      blocks.push({ t: "code", text: code.join("\n") });
      continue;
    }
    const h = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (h) {
      const text = h[2];
      const base = slugify(text);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      blocks.push({ t: "h", level: Math.min(Math.max(h[1].length, 2), 4) as 2 | 3 | 4, id: n ? `${base}-${n}` : base, text });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push({ t: "hr" }); i++; continue; }
    if (line.startsWith(">")) {
      const q: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) q.push(lines[i].replace(/^>\s?/, ""));
      blocks.push({ t: "quote", text: q.join(" ") });
      continue;
    }
    const list = /^(\s*)([-*]|\d+\.)\s+/.exec(line);
    if (list) {
      const ordered = /\d/.test(list[2]);
      const items: string[] = [];
      for (; i < lines.length; i++) {
        const m = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m || /\d/.test(/^\s*([-*]|\d+\.)/.exec(lines[i])![1]) !== ordered) break;
        items.push(m[1]);
      }
      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    const para: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|(-{3,}|\*{3,})\s*$|\s*([-*]|\d+\.)\s)/.test(lines[i]); i++) para.push(lines[i].trim());
    blocks.push({ t: "p", text: para.join(" ") });
  }
  return blocks;
}

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index!;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}${at}`;
    const tok = m[0];
    if (m[1]) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(tok.slice(2, -2), k)}</strong>);
    else if (m[3]) out.push(<em key={k}>{inline(tok.slice(1, -1), k)}</em>);
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      if (!SAFE_HREF.test(href)) out.push(label);
      else if (href.startsWith("/") || href.startsWith("#")) out.push(<Link key={k} href={href}>{inline(label, k)}</Link>);
      else out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer">{inline(label, k)}</a>);
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Headings for the sticky table of contents (ids match ArticleBody). */
export const getHeadings = (md: string): Heading[] =>
  parse(md).flatMap((b) => (b.t === "h" && b.level <= 3 ? [{ id: b.id, text: b.text, level: b.level }] : []));

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className={s.article}>
      {parse(markdown).map((b, i) => {
        switch (b.t) {
          case "h": {
            const H = `h${b.level}` as "h2" | "h3" | "h4";
            return <H key={i} id={b.id}>{inline(b.text)}</H>;
          }
          case "p": return <p key={i}>{inline(b.text)}</p>;
          case "ul": return <ul key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>;
          case "quote": return <blockquote key={i}>{inline(b.text)}</blockquote>;
          case "code": return <pre key={i}><code>{b.text}</code></pre>;
          case "hr": return <hr key={i} />;
        }
      })}
    </div>
  );
}
