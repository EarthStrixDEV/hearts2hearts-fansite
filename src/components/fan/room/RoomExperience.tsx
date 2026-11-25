"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/game/local-board";
import { Button } from "@/components/ui/Button";
import { togglePlacement, type Placement } from "@/lib/fan/room";
import s from "./room.module.css";
import type { SceneItem } from "./RoomScene";

const RoomScene = dynamic(() => import("./RoomScene"), { ssr: false });

export interface InventoryItem {
  id: string;
  slug: string;
  name: string;
  /** how it was earned, e.g. "Join a live waiting room" */
  from: string;
  modelUrl: string | null;
  placed: boolean;
  placement: Placement | null;
}
export interface LockedItem { id: string; name: string; text: string; have: number; need: number }

export interface RoomExperienceProps {
  nickname: string;
  items: InventoryItem[];
  locked: LockedItem[];
  setPlaced: (input: { itemId: string; placed: boolean; placement: Placement | null }) => Promise<{ saved: boolean }>;
}

const SKY_TOP = "#EAF4FF";
const SKY_BOTTOM = "#FFF8F3";

export function RoomExperience(p: RoomExperienceProps) {
  const reduced = usePrefersReducedMotion();
  const [items, setItems] = useState(p.items);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const grab = useRef<(() => HTMLCanvasElement) | null>(null);
  const onCapture = useCallback((fn: (() => HTMLCanvasElement) | null) => { grab.current = fn; }, []);
  const onReady = useCallback(() => setReady(true), []);

  const placed = items.filter((i) => i.placed && i.placement);
  const sceneItems: SceneItem[] = placed.map((i) => ({ id: i.id, slug: i.slug, modelUrl: i.modelUrl, placement: i.placement as Placement }));

  const toggle = async (id: string) => {
    if (busy.has(id)) return;
    const next = togglePlacement(items, id);
    const before = items.find((i) => i.id === id);
    if (!next || !before) return;
    setItems(next.items); // optimistic
    setBusy((b) => new Set(b).add(id));
    setMessage(null);
    let saved = false;
    try { saved = (await p.setPlaced({ itemId: id, ...next.change })).saved; } catch { saved = false; }
    setBusy((b) => { const n = new Set(b); n.delete(id); return n; });
    if (!saved) {
      setItems((cur) => cur.map((i) => (i.id === id ? before : i)));
      setMessage(`Couldn’t save that change to ${before.name}. Try again.`);
    }
  };

  const share = () => {
    const src = grab.current?.();
    if (!src) return;
    // the WebGL canvas is transparent: paint the room's sky behind it, then a small caption
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height + 56;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, 0, out.height);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    ctx.fillStyle = "#2B2440";
    ctx.font = "600 26px ui-rounded, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${p.nickname}’s room · Hearts2Hearts S2U`, out.width / 2, out.height - 20, out.width - 40);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "s2u-my-room.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  return (
    <div className={s.root}>
      <div className={s.col}>
        <header className={s.head}>
          <Link href="/fan" className={s.back}>← S2U hub</Link>
          <span className="lbl" style={{ color: "var(--pink-700)" }}>Space · my room</span>
          <h1 className={`disp ${s.h1}`}>{p.nickname}’s room</h1>
          <p className={s.lede}>Everything here was earned: missions, live rooms, Wrapped. Nothing is bought.</p>
        </header>

        <div className={s.grid}>
          <section className={s.stage} aria-label="Room">
            <div className={s.canvas} role="img" aria-label={`Isometric 3D view of your room with ${placed.length} ${placed.length === 1 ? "item" : "items"} placed.`}>
              <RoomScene items={sceneItems} reduced={reduced} onCapture={onCapture} onReady={onReady} />
              {!ready && <span className={s.loading} role="status">Building your room…</span>}
            </div>
          </section>

          <aside className={s.side}>
            <section className="panel" style={{ gap: 10, padding: 24, borderRadius: 24 }} aria-labelledby="room-inv">
              <div className={s.invHead}>
                <span id="room-inv" className="lbl">Inventory</span>
                <span className={`chip ${s.placedChip}`} aria-live="polite">{placed.length} placed</span>
              </div>
              {items.length === 0 && <p className={s.empty}>Nothing earned yet. Join a live room, complete missions or collect photocards and your first item lands here.</p>}
              {items.map((i) => (
                <button key={i.id} type="button" className={`${s.row} ${i.placed ? s.rowOn : ""}`} aria-pressed={i.placed} disabled={busy.has(i.id)} onClick={() => toggle(i.id)}>
                  <span className={s.rowText}>
                    <span className={s.rowName}>{i.name}</span>
                    <span className={s.rowFrom}>{i.from}</span>
                  </span>
                  <span className={`chip ${i.placed ? s.chipOn : s.chipOff}`}>{i.placed ? "In room" : "Place"}</span>
                </button>
              ))}
              <p className={s.error} role="alert">{message}</p>
            </section>

            <section className={s.locked} aria-labelledby="room-locked">
              <span id="room-locked" className="lbl" style={{ color: "#B9B0D6" }}>Locked</span>
              {p.locked.length === 0 ? (
                <span className={s.lockedText}>Everything is unlocked.</span>
              ) : (
                <ul className={s.lockedList}>
                  {p.locked.map((l) => (
                    <li key={l.id} className={s.lockedText}>
                      <b>{l.name}</b> · {l.text} <span className={s.progress}>({l.have} / {l.need})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Button onClick={share} disabled={!ready}>Share my room</Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
