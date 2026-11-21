"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { cn } from "@/lib/utils";
import type { MemberCardData, PositionTag } from "./profile";
import styles from "./members.module.css";

type Filter = "all" | PositionTag;
type Sort = "debut" | "age" | "name";
type View = "grid" | "card";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" }, { key: "vocal", label: "Vocal" }, { key: "dance", label: "Dance" },
  { key: "rap", label: "Rap" }, { key: "visual", label: "Visual" },
];
const VIEWS: { key: View; label: string }[] = [{ key: "grid", label: "Grid" }, { key: "card", label: "Photocard" }];

const grad = (hex: string) => `linear-gradient(165deg,${hex}, #FFF8F3 130%)`;

/** Position filter + sort + grid/photocard view. `members` arrive in debut order (sort_order). */
export function MembersBrowser({ members }: { members: MemberCardData[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("debut");
  const [view, setView] = useState<View>("grid");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const list = useMemo(() => {
    const l = members.filter((m) => filter === "all" || m.tags.includes(filter));
    if (sort === "age") l.sort((a, b) => a.born.localeCompare(b.born));
    if (sort === "name") l.sort((a, b) => a.name.localeCompare(b.name));
    return l;
  }, [members, filter, sort]);

  return (
    <>
      <div className="glass sticky top-[76px] z-20 mb-7 flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-3">
        <div role="group" aria-label="Filter by position" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={cn(styles.seg, filter === f.key && styles.on)} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="member-sort" className="text-sm text-ink-500">Sort by</label>
          <span className={cn(styles.sel, "relative inline-flex")}>
            <select id="member-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="age">Age (oldest first)</option>
              <option value="name">Name (A–Z)</option>
              <option value="debut">Debut order</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -mt-[7px]">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <div role="group" aria-label="View" className="flex gap-1 rounded-full bg-line p-1">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" className={cn(styles.seg, view === v.key && styles.on)} aria-pressed={view === v.key} onClick={() => setView(v.key)} style={{ minHeight: 36 }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-line px-6 py-16 text-center text-ink-500">
          <HeartIcon size={72} fill="#FFE3F1" />
          <span>{filter === "visual" ? "Visual positions aren’t in the member data yet. Add them from an official source." : "No one matches that filter yet."}</span>
        </div>
      ) : view === "grid" ? (
        <div className={styles.mgrid}>
          {list.map((m) => (
            <Link key={m.slug} href={`/members/${m.slug}`} aria-label={`${m.name} profile`} className={cn("fx", styles.mc)} style={{ background: m.color }}>
              <span className={styles.ph} style={{ position: "absolute", inset: 0, display: "block", background: grad(m.color) }} />
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: m.color, display: "block", filter: "saturate(1.6) brightness(.9)" }} />
              <Chip bg="rgba(255,255,255,.85)" color="#2B2440" style={{ position: "absolute", top: 14, left: 14 }}>TODO · photo</Chip>
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "60%", display: "block", background: "linear-gradient(0deg, rgba(43,36,64,.78), rgba(43,36,64,0))" }} />
              <span className={cn(styles.meta, "absolute inset-x-4 bottom-4 flex flex-col gap-1.5")}>
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className={cn("disp", styles.nm)} style={{ fontSize: 28, fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: 14, opacity: 0.9 }}>{m.ko}</span>
                </span>
                <Chip bg={m.color} color="#2B2440" className="self-start">{m.position}</Chip>
              </span>
              <span className={cn(styles.fact, "absolute inset-x-0 bottom-0 block px-4 py-3.5 text-[13px] leading-normal")} style={{ background: "rgba(255,255,255,.92)", color: "#2B2440" }}>
                {m.fact}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.mgrid}>
          {list.map((m) => {
            const f = !!flipped[m.slug];
            return (
              <div key={m.slug} className="flex flex-col gap-2.5">
                <button
                  type="button"
                  className={cn("fx", styles.pcard)}
                  style={{ borderRadius: 24 }}
                  aria-label={`${m.name} photocard, ${f ? "back side" : "front side"}. Click to flip`}
                  onClick={() => setFlipped((s) => ({ ...s, [m.slug]: !s[m.slug] }))}
                >
                  <span style={{ display: "block", position: "relative", aspectRatio: "3 / 4", transformStyle: "preserve-3d", transition: "transform 650ms cubic-bezier(.34,1.56,.64,1)", transform: f ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: 24, border: "5px solid #fff", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: grad(m.color), boxShadow: "0 14px 28px rgba(43,36,64,.14)", display: "block" }}>
                      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, transparent 25%, rgba(255,182,213,.8) 40%, rgba(201,182,255,.8) 50%, rgba(168,216,255,.8) 60%, transparent 75%)", mixBlendMode: "color-dodge", opacity: 0.35, display: "block" }} />
                      <span className="disp" style={{ position: "absolute", left: 14, bottom: 12, color: "#fff", fontSize: 24, fontWeight: 600, textShadow: "0 1px 8px rgba(43,36,64,.45)" }}>{m.name}</span>
                    </span>
                    <span style={{ position: "absolute", inset: 0, borderRadius: 24, border: "5px solid #fff", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: m.color, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#2B2440" }}>
                      <span className="sig" style={{ fontSize: 46, transform: "rotate(-6deg)", display: "block" }}>{m.name}</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, lineHeight: 1.45 }}>
                        <span>Born {m.bornLabel}</span>
                        <span>{m.nationality}</span>
                        <span>{m.fact}</span>
                      </span>
                    </span>
                  </span>
                </button>
                <Link href={`/members/${m.slug}`} className="btn btn-s" style={{ minHeight: 40, fontSize: 14 }}>View {m.name}</Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
