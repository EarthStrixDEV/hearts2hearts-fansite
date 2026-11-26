// View-model helpers for the notice reader UI (pure, shared by the page and its tests).
import type { NoticeItem } from "@/lib/db/fan-types";
import { needsCheck } from "./notice";
import { formatZoned, ICT, KST } from "./time";

export type Phase = "idle" | "uploading" | "reading" | "done" | "failed";
export type StepState = "todo" | "active" | "done";

export const STEPS = ["Read Korean text (OCR)", "Translate and pull out dates", "Convert KST to Thai time"] as const;

/** One state per step. The model reads and translates in a single call, so those two move together; the time conversion runs after it. */
export function stepStates(phase: Phase): [StepState, StepState, StepState] {
  switch (phase) {
    case "uploading": return ["active", "todo", "todo"];
    case "reading": return ["active", "active", "todo"];
    case "done": return ["done", "done", "done"];
    default: return ["todo", "todo", "todo"];
  }
}

const TINTS = ["#FFB6D5", "#C9B6FF", "#A8D8FF"];
const TBA_TINT = "#FFE08A";

export interface EventView {
  index: number;
  mon: string;
  day: string;
  titleKo: string;
  title: string;
  kst: string;
  ict: string;
  tint: string;
  check: boolean;
  hasTime: boolean;
}

/** "Dec 5, 17:00" in `zone`: the date is kept because the Thai date can differ from the Korean one near midnight. */
const when = (iso: string, zone: string) => formatZoned(iso, zone, false);

export function eventView(item: NoticeItem, index: number): EventView {
  const base = { index, titleKo: item.title_ko, title: item.title_th.trim() || item.title_ko.trim() || "Untitled event", check: needsCheck(item) };
  if (!item.starts_at) return { ...base, mon: "TBA", day: "—", kst: "TBA", ict: "TBA", tint: TBA_TINT, hasTime: false };
  const d = new Date(item.starts_at);
  const mon = new Intl.DateTimeFormat("en-US", { timeZone: KST, month: "short" }).format(d).toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { timeZone: KST, day: "numeric" }).format(d);
  return { ...base, mon, day, kst: when(item.starts_at, KST), ict: when(item.starts_at, ICT), tint: TINTS[index % TINTS.length], hasTime: true };
}

export const timedCount = (items: NoticeItem[]) => items.filter((i) => i.starts_at).length;

export const ACCEPT = "image/png,image/jpeg,image/webp";
const OK_TYPES = new Set(ACCEPT.split(","));

/** Quick client-side check for a friendly message; the server re-checks the bytes. */
export function pickError(f: { type: string; size: number }, maxBytes: number): string | null {
  if (!OK_TYPES.has(f.type)) return "Only PNG, JPEG or WebP images can be read.";
  if (f.size === 0 || f.size > maxBytes) return "Images must be 8 MB or smaller.";
  return null;
}
