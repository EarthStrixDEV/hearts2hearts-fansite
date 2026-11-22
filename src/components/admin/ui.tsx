import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentStatus } from "@/lib/db/types";

export type Tone = "ok" | "warn" | "bad" | "neu" | "acc";

export function Badge({ tone = "neu", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`a-badge b-${tone} ${className}`}>{children}</span>;
}

const STATUS_TONE: Record<ContentStatus, Tone> = { published: "ok", draft: "warn", archived: "neu" };
export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived"}</Badge>;
}

export function PageHead({ title, desc, actions }: { title: string; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="a-pagehead">
      <div>
        <h1>{title}</h1>
        {desc ? <p>{desc}</p> : null}
      </div>
      {actions ? <div className="a-cluster">{actions}</div> : null}
    </div>
  );
}

export function Seg({ label, items }: { label: string; items: { href: string; label: string; on: boolean }[] }) {
  return (
    <div role="group" aria-label={label} className="a-seg-wrap">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className={i.on ? "a-seg on" : "a-seg"} aria-current={i.on ? "true" : undefined} scroll={false}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}

/** GET search box that keeps the other query params (filters, selection). */
export function SearchForm({ q, hidden, placeholder = "Search" }: { q?: string; hidden?: Record<string, string | undefined>; placeholder?: string }) {
  return (
    <form method="get" role="search" className="a-cluster" style={{ flex: "1 1 240px", maxWidth: 360, flexWrap: "nowrap" }}>
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="a-vh" htmlFor="a-q">{placeholder}</label>
      <input id="a-q" name="q" type="search" defaultValue={q} placeholder={placeholder} className="a-inp" />
      <button type="submit" className="a-btn">Search</button>
    </form>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`a-fld ${className}`}>
      <span className="a-lbl">{label}</span>
      {children}
      {hint ? <span className="a-hint">{hint}</span> : null}
    </label>
  );
}

/** `url` is a signed URL from signedUrls(); the bucket is private. */
export function Thumb({ url, ratio = "sq", empty = "No image", color }: { url?: string | null; ratio?: "sq" | "wide"; empty?: string; color?: string }) {
  return (
    <span className={`a-thumb a-${ratio}`} style={!url && color ? { background: color } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" loading="lazy" /> : <span>{empty}</span>}
    </span>
  );
}

export function MediaSelect({ name, value, options, label = "Image" }: { name: string; value?: string | null; options: { id: string; label: string }[]; label?: string }) {
  const known = !value || options.some((o) => o.id === value);
  return (
    <Field label={label}>
      <select name={name} defaultValue={value ?? ""} className="a-inp">
        <option value="">None</option>
        {!known && <option value={value!}>(current file)</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function ReadOnlyBanner() {
  return (
    <div className="a-banner" role="note">
      The database or Neon Auth isn&apos;t configured (DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET), so the admin is a read-only preview. Nothing can be saved yet.
    </div>
  );
}

export function FormFoot({ children }: { children: ReactNode }) {
  return <div className="a-foot">{children}</div>;
}

/** Pick several library images (e.g. a member gallery). Hold Ctrl/Cmd to select more than one. */
export function MediaMultiSelect({ name, values, options, label = "Images", hint }: { name: string; values: string[]; options: { id: string; label: string }[]; label?: string; hint?: ReactNode }) {
  const known = new Set(options.map((o) => o.id));
  const extra = values.filter((v) => !known.has(v));
  return (
    <Field label={label} hint={hint} className="a-full">
      <select name={name} multiple size={6} defaultValue={values} className="a-inp">
        {extra.map((v) => <option key={v} value={v}>(current file)</option>)}
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </Field>
  );
}
