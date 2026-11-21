"use client";

import { Chip } from "@/components/ui/Chip";
import { HeartIcon } from "@/components/ui/HeartIcon";
import type { GameCatalogEntry } from "@/lib/db/seed/game";

function Art({ kind }: { kind: GameCatalogEntry["key"] }) {
  if (kind === "quiz")
    return (
      <>
        <span className="disp absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[110px] font-bold leading-none text-white/85">?</span>
        <span className="absolute right-[24%] top-[22%]"><HeartIcon size={34} fill="#fff" /></span>
      </>
    );
  if (kind === "memory")
    return (
      <>
        <span className="absolute left-1/2 top-1/2 block h-[86px] w-16 rounded-[10px] bg-white shadow-[0_8px_18px_rgba(43,36,64,.15)]" style={{ margin: "-43px 0 0 -80px", transform: "rotate(-10deg)" }} />
        <span className="absolute left-1/2 top-1/2 box-border block h-[86px] w-16 rounded-[10px] border-4 border-white bg-[#FFB3CF] shadow-[0_8px_18px_rgba(43,36,64,.15)]" style={{ margin: "-43px 0 0 6px", transform: "rotate(8deg)" }} />
      </>
    );
  return (
    <span className="absolute left-1/2 top-1/2 flex h-[70px] -translate-x-1/2 -translate-y-1/2 items-end gap-1.5">
      {[40, 70, 28, 56, 36].map((h, i) => <span key={i} className="block w-3 rounded-md bg-white" style={{ height: h }} />)}
    </span>
  );
}

export function GameHub({ catalog, best, onStart }: { catalog: GameCatalogEntry[]; best: Record<string, string>; onStart: (key: "quiz" | "memory") => void }) {
  return (
    <div className="grid w-full gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
      {catalog.map((g) => (
        <div key={g.key} className="gm-card glass flex flex-col overflow-hidden rounded-card">
          <div className="relative h-[180px] overflow-hidden" style={{ background: g.bg }} aria-hidden="true">
            <Art kind={g.key} />
          </div>
          <div className="flex flex-1 flex-col gap-2.5 p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="disp text-[22px] font-semibold">{g.name}</span>
              <Chip bg={g.diffBg} color="#2B2440">{g.difficulty}</Chip>
            </div>
            <span className="text-sm leading-[1.55] text-ink-500">{g.desc}</span>
            <span className="text-[13px] text-ink-500">Best: <strong className="text-ink-900">{best[g.name] ?? "—"}</strong></span>
            <button
              type="button"
              className="btn btn-p mt-auto"
              disabled={g.locked}
              onClick={() => g.key !== "song" && onStart(g.key)}
            >
              {g.cta}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
