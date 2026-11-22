"use client";

import { useState } from "react";
import { xImageSize } from "@/lib/media-url";
import type { MusicRelease, ReleaseTab } from "@/lib/db/music";
import { PlayIcon } from "./icons";
import s from "./music.module.css";

const TABS: { id: "all" | ReleaseTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "albums", label: "Albums" },
  { id: "singles", label: "Singles" },
  { id: "ost", label: "OST" },
  { id: "special", label: "Special" },
];

export function AlbumGrid({ releases, onPlay }: { releases: MusicRelease[]; onPlay: (release: MusicRelease) => void }) {
  const [tab, setTab] = useState<"all" | ReleaseTab>("all");
  const shown = releases.filter((r) => tab === "all" || r.tab === tab);
  const tabLabel = TABS.find((t) => t.id === tab)!.label;

  return (
    <section aria-labelledby="dg">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h2 id="dg" className={`disp ${s.h2}`}>Discography</h2>
        <div role="tablist" aria-label="Release type" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" className={s.seg} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {shown.length > 0 ? (
        <div className={s.albGrid}>
          {shown.map((r) => (
            <button key={r.slug} className={s.alb} onClick={() => onPlay(r)} aria-label={`Play ${r.title}`}>
              <span className={s.art}>
                <span className={s.vin} />
                <span className={s.cov} style={{ background: r.cover ? `center / cover no-repeat url("${xImageSize(r.cover, "small")}")` : r.grad }} />
                <span className={s.play} aria-hidden="true"><PlayIcon /></span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{r.title}</span>
                <span className={s.note}>
                  {[r.release_date?.slice(0, 4), r.kind, r.track_label].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className={s.empty}>No {tabLabel} releases yet. They’ll appear here once officially announced.</div>
      )}
    </section>
  );
}
