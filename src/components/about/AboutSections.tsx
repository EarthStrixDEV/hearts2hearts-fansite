import type { AboutContent } from "@/lib/db/pages";
import styles from "./about.module.css";

export function GroupInfo({ info }: { info: AboutContent["info"] }) {
  return (
    <section aria-labelledby="gi" className="glass rounded-card p-8" style={{ boxShadow: "var(--shadow)" }}>
      <h2 id="gi" className="disp m-0 mb-6 text-[28px] font-semibold">Group info</h2>
      <dl className="m-0 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}>
        {info.map((r) => (
          <div key={r.key} className="flex flex-col gap-1.5 rounded-2xl bg-surface p-[18px]">
            <dt className="text-[13px] text-ink-500">{r.label}</dt>
            <dd className="disp m-0 text-[22px] font-semibold" style={{ color: r.muted ? "var(--ink-500)" : "inherit" }}>{r.value}</dd>
            {r.sub && <span className="text-[13px] text-ink-500">{r.sub}</span>}
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StoryTimeline({ story }: { story: AboutContent["story"] }) {
  return (
    <section aria-labelledby="st">
      <h2 id="st" className="disp m-0 mb-7 text-[32px] font-semibold">Our story so far</h2>
      <ol className="m-0 flex max-w-[760px] list-none flex-col p-0">
        {story.map((t, i) => (
          <li key={`${t.when}-${t.title}`} className="grid gap-4" style={{ gridTemplateColumns: "minmax(64px, 120px) 24px minmax(0, 1fr)" }}>
            <span className="pt-0.5 text-right text-[13px] font-semibold text-pink-700">{t.when}</span>
            <span className="flex flex-col items-center">
              <span className="mt-[3px] block h-3.5 w-3.5 flex-none rounded-full" style={{ background: t.dot, boxShadow: `0 0 0 4px var(--cream-50), 0 0 0 5px ${t.dot}` }} />
              {i < story.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
            </span>
            <span className="flex flex-col gap-1 pb-7">
              <span className="disp text-xl font-semibold">{t.title}</span>
              <span className="text-[15px] leading-relaxed text-ink-500">{t.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OfficialLinks({ links }: { links: AboutContent["links"] }) {
  return (
    <section aria-labelledby="ol">
      <h2 id="ol" className="disp m-0 mb-5 text-[32px] font-semibold">Official links</h2>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(170px, 100%), 1fr))" }}>
        {links.map((l) => (
          <a key={l.name} className={styles.lcard} href={l.href}>
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: l.bg }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2B2440" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={l.icon} /></svg>
            </span>
            <span className="disp text-lg font-semibold">{l.name}</span>
            <span className="text-[13px] text-ink-500">{l.handle}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
