import type { MusicEra } from "@/lib/db/music";
import s from "./music.module.css";

export function EraTimeline({ eras }: { eras: MusicEra[] }) {
  return (
    <section aria-labelledby="et">
      <h2 id="et" className={`disp ${s.h2}`} style={{ marginBottom: 16 }}>Era timeline</h2>
      <ol className={s.hscroll} style={{ listStyle: "none", margin: 0 }}>
        {eras.map((e) => (
          <li key={e.title} className={s.era}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }} aria-hidden="true">
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: e.dot, display: "block", boxShadow: `0 0 0 4px var(--cream-50), 0 0 0 5px ${e.dot}` }} />
              <span style={{ flex: 1, height: 2, background: "var(--line)", display: "block" }} />
            </div>
            <div style={{ aspectRatio: "4 / 5", borderRadius: 18, background: e.grad }} />
            <span className={s.note}>{e.date}</span>
            <span className="disp" style={{ fontSize: 20, fontWeight: 600, marginTop: -8 }}>{e.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
