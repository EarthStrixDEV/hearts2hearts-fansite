"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { NoticeItem, ReminderKind } from "@/lib/db/fan-types";
import { googleCalendarUrl, MAX_IMAGE_BYTES } from "@/lib/fan/notice";
import { ACCEPT, eventView, pickError, STEPS, stepStates, timedCount, type Phase } from "@/lib/fan/notice-view";
import s from "./notice.module.css";

export interface NoticeReaderProps {
  /** false when storage or the LLM key is missing: the page explains it instead of failing on click */
  ready: boolean;
  isEditor: boolean;
  /** the user's latest reading, so a refresh keeps it */
  initial: { jobId: string; phase: "queued" | "done" | "failed"; items: NoticeItem[]; error: string | null; imageUrl: string | null } | null;
  initialReminders: ReminderKind[];
}

const REMINDERS: { kind: ReminderKind; label: string }[] = [
  { kind: "1h", label: "1 hour before" },
  { kind: "15m", label: "15 min before" },
  { kind: "vote", label: "Voting opens" },
];

async function post<T>(url: string, body?: BodyInit | object): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method: "POST",
    headers: body && !isForm ? { "content-type": "application/json" } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}

export function NoticeReader({ ready, isEditor, initial, initialReminders }: NoticeReaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [jobId, setJobId] = useState<string | null>(initial?.jobId ?? null);
  const [phase, setPhase] = useState<Phase>(initial ? (initial.phase === "done" ? "done" : initial.phase === "failed" ? "failed" : "idle") : "idle");
  const [items, setItems] = useState<NoticeItem[]>(initial?.phase === "done" ? initial.items : []);
  const [error, setError] = useState<string | null>(initial?.phase === "failed" ? initial.error : null);
  const [over, setOver] = useState(false);
  const [reminders, setReminders] = useState<ReminderKind[]>(initialReminders);
  const [remBusy, setRemBusy] = useState<ReminderKind | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  // object URLs of local previews are revoked on replace (in pick) and on unmount
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const busy = phase === "uploading" || phase === "reading";
  const steps = stepStates(phase);
  const views = items.map((it, i) => eventView(it, i));
  const timed = timedCount(items);

  function pick(f: File | undefined) {
    if (!f || busy) return;
    const bad = pickError(f, MAX_IMAGE_BYTES);
    if (bad) { setError(bad); setPhase("failed"); return; }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(objectUrl.current);
    setJobId(null);
    setItems([]);
    setReminders([]);
    setNote(null);
    setError(null);
    setPhase("idle");
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files[0]);
  };

  async function run() {
    if (busy) return;
    setError(null);
    setNote(null);
    try {
      let id = jobId;
      if (!id) {
        if (!file) { setError("Choose a notice image first."); setPhase("failed"); return; }
        setPhase("uploading");
        const fd = new FormData();
        fd.set("file", file);
        const up = await post<{ id: string }>("/api/fan/notice", fd);
        if (!up.ok) { setError(up.data.error ?? "Upload failed. Try again."); setPhase("failed"); return; }
        id = up.data.id;
        setJobId(id);
      }
      setPhase("reading");
      const r = await post<{ state: "done" | "failed"; items?: NoticeItem[] }>(`/api/fan/notice/${id}/read`);
      if (r.ok && r.data.state === "done") { setItems(r.data.items ?? []); setPhase("done"); return; }
      setError(r.data.error ?? "The notice couldn't be read. Try again.");
      setPhase("failed");
    } catch {
      setError("Network problem. Check your connection and try again.");
      setPhase("failed");
    }
  }

  async function toggleReminder(kind: ReminderKind) {
    if (!jobId || remBusy) return;
    const on = !reminders.includes(kind);
    setRemBusy(kind);
    setNote(null);
    try {
      const r = await post<{ on: boolean; count: number }>(`/api/fan/notice/${jobId}/reminders`, { kind, on });
      if (!r.ok) { setNote(r.data.error ?? "Couldn't save the reminder."); return; }
      setReminders((cur) => (r.data.on ? [...new Set([...cur, kind])] : cur.filter((k) => k !== kind)));
      if (on && !r.data.on) setNote("Those moments have already passed.");
    } catch {
      setNote("Network problem. Try again.");
    } finally {
      setRemBusy(null);
    }
  }

  async function sendToSchedule() {
    if (!jobId || sending) return;
    setSending(true);
    setNote(null);
    try {
      const r = await post<{ created: number; alreadyThere: number; skippedNoTime: number }>(`/api/fan/notice/${jobId}/schedule`, {});
      if (!r.ok) { setNote(r.data.error ?? "Couldn't send to /schedule."); return; }
      const d = r.data;
      setNote(`Added ${d.created} draft${d.created === 1 ? "" : "s"} for review in the admin Events list.${d.alreadyThere ? ` ${d.alreadyThere} already there.` : ""}${d.skippedNoTime ? ` ${d.skippedNoTime} skipped (no time).` : ""}`);
    } catch {
      setNote("Network problem. Try again.");
    } finally {
      setSending(false);
    }
  }

  const buttonLabel = phase === "uploading" ? "Uploading…" : phase === "reading" ? "Reading the notice…" : phase === "failed" && jobId ? "Try reading again" : "Read with AI";
  const canRun = ready && !busy && (jobId !== null || file !== null);

  return (
    <div className={s.root}>
      <div className={s.col}>
        <div className={s.intro}>
          <Link href="/fan" className={s.back}>← S2U hub</Link>
          <span className="lbl" style={{ color: "var(--pink-700)" }}>Schedule · AI notice reader</span>
          <h1 className={`disp ${s.h1}`}>Drop a Korean notice. Get Thai-time events.</h1>
          <p className={s.lead}>AI reads the schedule image, translates each line and converts KST to Thai time (ICT, two hours behind). Always check against the original notice before you share.</p>
        </div>

        <div className={s.grid}>
          <section className={s.card + " " + s.cardL} aria-labelledby="nr-image">
            <span id="nr-image" className="lbl">1 · Notice image</span>
            <label
              className={`${s.zone} ${over ? s.zoneOver : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
            >
              <input ref={input} type="file" accept={ACCEPT} className={s.sr} disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob / signed URL preview */}
                  <img src={previewUrl} alt="The notice image you chose" className={s.preview} />
                  <span className={s.previewBar}>{busy ? "Working…" : "Tap to choose a different image"}</span>
                </>
              ) : (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--pink-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
                  <span className={`disp ${s.zoneTitle}`}>Drop the schedule image here</span>
                  <span className={s.hint}>PNG, JPG or WebP from the official account · up to 8 MB</span>
                </>
              )}
            </label>

            <button type="button" className={`btn btn-p ${s.btn}`} onClick={run} disabled={!canRun} aria-busy={busy || undefined}>
              {busy && <span className={s.spin} aria-hidden="true" />}
              {buttonLabel}
            </button>
            {phase === "done" && (
              <button type="button" className={`btn btn-s ${s.btn}`} onClick={() => input.current?.click()}>Choose another image</button>
            )}

            {!ready && <p className={s.msg}>AI reading isn’t switched on for this site yet, so notices can’t be read right now.</p>}
            {error && <p className={`${s.msg} ${s.msgErr}`} role="alert">{error}</p>}

            <ol className={s.steps} aria-label="Progress">
              {STEPS.map((label, i) => (
                <li key={label} className={`${s.step} ${steps[i] !== "todo" ? s.stepOn : ""}`}>
                  <span className={`${s.dot} ${steps[i] === "done" ? s.dotDone : steps[i] === "active" ? s.dotActive : ""}`} aria-hidden="true">{i + 1}</span>
                  {label}
                  <span className={s.sr}>{steps[i] === "done" ? " (done)" : steps[i] === "active" ? " (in progress)" : ""}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={s.card + " " + s.cardR} aria-labelledby="nr-events">
            <div className={s.head}>
              <span id="nr-events" className="lbl">2 · Events found</span>
              {phase === "done" && <span className="chip" style={{ background: "color-mix(in srgb, var(--pink-500) 14%, var(--surface))", color: "var(--ink-900)" }}>Read by AI · check the original</span>}
            </div>

            {phase !== "done" && <div className={s.empty}>Nothing read yet. Events appear here with both KST and Thai time.</div>}

            {phase === "done" && views.length === 0 && <div className={s.empty}>The AI didn’t find any events in this image. Is it a schedule notice?</div>}

            {phase === "done" && views.length > 0 && (
              <>
                <ul className={s.list}>
                  {views.map((v) => (
                    <li key={v.index} className={s.ev}>
                      <div className={s.date} style={{ background: v.tint } as CSSProperties}>
                        <span className={s.mon}>{v.mon}</span>
                        <span className={`disp ${s.day}`}>{v.day}</span>
                      </div>
                      <div className={s.body}>
                        <span className={s.ko} lang="ko">{v.titleKo}</span>
                        <span className={s.title}>{v.title}</span>
                        <span className={s.time}>KST {v.kst} · <b>Thai time {v.ict}</b></span>
                      </div>
                      <div className={s.side}>
                        <span className={`chip ${v.check ? s.chipCheck : s.chipOk}`}>{v.check ? "Check original" : "Clear"}</span>
                        {v.hasTime && jobId && (
                          <>
                            <a className={`btn btn-s ${s.small}`} href={googleCalendarUrl(v.title, items[v.index].starts_at!)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
                            <a className={s.dl} href={`/api/fan/ics?job=${jobId}&i=${v.index}`} download>.ics</a>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className={s.actions}>
                  {timed > 0 && jobId && <a className="btn btn-p" href={`/api/fan/ics?job=${jobId}&i=all`} download>Add all {timed} to calendar</a>}
                  {isEditor && <button type="button" className="btn btn-s" onClick={sendToSchedule} disabled={sending || timed === 0}>Send to /schedule</button>}
                </div>
              </>
            )}
            {note && <p className={s.msg} role="status">{note}</p>}
          </section>
        </div>

        <section className={s.remind} aria-labelledby="nr-remind">
          <div className={s.remindL}>
            <span className="lbl" style={{ color: "#B9B0D6" }}>Reminders</span>
            <span id="nr-remind" className={`disp ${s.remindTitle}`}>Remind me before each event</span>
            <span className={s.remindText}>
              {phase === "done" && timed > 0
                ? "Your choice is saved in Thai time. Sending isn’t switched on yet, so no push or LINE notice will arrive for now."
                : "Read a notice with dated events first, then pick when you want to be reminded."}
            </span>
          </div>
          <div className={s.remindBtns}>
            {REMINDERS.map((r) => (
              <button key={r.kind} type="button" className={`${s.rbtn} ${reminders.includes(r.kind) ? s.rbtnOn : ""}`} aria-pressed={reminders.includes(r.kind)} disabled={phase !== "done" || timed === 0 || remBusy !== null} onClick={() => toggleReminder(r.kind)}>
                {r.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
