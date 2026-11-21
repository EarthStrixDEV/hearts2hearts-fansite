import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { EraCards } from "@/components/members/EraCards";
import { FeaturedSongs } from "@/components/members/FeaturedSongs";
import { MemberGallery } from "@/components/members/MemberGallery";
import {
  accentDeep, accentSoft, accentTint, factValue, factValues, fmtDate, memberGrad, zodiac,
} from "@/components/members/profile";
import styles from "@/components/members/member-detail.module.css";
import { Chip } from "@/components/ui/Chip";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { FACT, getEras, getMember, getMemberTracks, getMembers } from "@/lib/db/members";
import { PLACEHOLDER_GRADS } from "@/lib/db/seed/home";

type Props = { params: Promise<{ slug: string }> };

const STICKER_ROT = [-2.5, 1.8, -1.2, 2.4];
const STICKER_ICONS = [
  "M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z",
  "M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z",
  "M9 18V6l11-2v12a3 3 0 1 1-2-2.8V7.4L11 8.6V18a3 3 0 1 1-2-2.8z",
];
const eraGrad = (i: number) => PLACEHOLDER_GRADS[i % PLACEHOLDER_GRADS.length];

export async function generateStaticParams() {
  // A DB that is unreachable or not migrated yet must not fail the build: pages then render on demand.
  try {
    return (await getMembers()).map((m) => ({ slug: m.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await getMember((await params).slug);
  return { title: m ? m.stage_name : "Member" };
}

export default async function MemberPage({ params }: Props) {
  const { slug } = await params;
  const [member, members, eras] = await Promise.all([getMember(slug), getMembers(), getEras()]);
  if (!member) notFound();
  const tracks = await getMemberTracks(member);

  const i = members.findIndex((m) => m.slug === slug);
  const prev = members[(i + members.length - 1) % members.length];
  const next = members[(i + 1) % members.length];

  const color = member.color_hex;
  const deep = accentDeep(color);
  const positions = member.position ?? [];
  const nationality = factValue(member, FACT.nationality);
  const todo = (v: string | undefined) => (v ? { v } : { v: "TODO · verify", muted: true });
  const info: { k: string; v: string; muted?: boolean; star?: boolean }[] = [
    { k: "Stage name", v: member.name_ko ? `${member.stage_name} (${member.name_ko})` : member.stage_name },
    { k: "Birth name", ...todo(member.real_name ?? undefined) },
    ...(member.birth_date ? [{ k: "Birthday", v: `${fmtDate(member.birth_date)} · ${zodiac(member.birth_date)}`, star: true }] : []),
    { k: "Nationality", ...todo(nationality) },
    { k: "Height", ...todo(factValue(member, FACT.height)) },
    { k: "MBTI", ...todo(factValue(member, FACT.mbti)) },
    { k: "Position", v: positions.join(" · ") },
    { k: "Member color", v: `${color} (fan-picked; official TODO)` },
  ];
  const facts = [...factValues(member, FACT.fun), ...(nationality ? [`Nationality: ${nationality}.`] : [])];
  const preDebut = factValue(member, FACT.preDebut);
  const timeline = [
    ...(preDebut ? [{ when: "Pre-debut", title: "Trainee days", body: preDebut }] : []),
    ...eras.map((e) => ({ when: fmtDate(e.date), title: e.title, body: e.body })),
  ];
  const songs = tracks.map((t, k) => {
    const era = eras.findIndex((e) => e.title === t.album);
    return { ...t, grad: eraGrad(era >= 0 ? era : k) };
  });

  const vars = { "--accent": color, "--accent-deep": deep, "--accent-soft": accentSoft(color) } as CSSProperties;

  return (
    <div className={styles.detail} style={vars}>
      {/* 1 HERO */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${accentTint(color)}, rgba(255,255,255,0) 70%)` }}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-6 pb-16 pt-7">
          <nav aria-label="Breadcrumb">
            <ol className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm">
              <li><Link className={`fx ${styles.crumb}`} href="/">Home</Link></li>
              <li aria-hidden="true" className="text-ink-500">/</li>
              <li><Link className={`fx ${styles.crumb}`} href="/members">Members</Link></li>
              <li aria-hidden="true" className="text-ink-500">/</li>
              <li aria-current="page" className="font-semibold">{member.stage_name}</li>
            </ol>
          </nav>
          <div className="flex flex-wrap items-center gap-12">
            <div
              className={styles.portrait}
              style={{ flex: "1 1 320px", maxWidth: 440, aspectRatio: "3 / 4", borderRadius: 28, position: "relative", overflow: "hidden", background: memberGrad(color), boxShadow: "0 0 0 4px #fff, 0 0 0 8px var(--accent), 0 0 56px var(--accent)", margin: 8 }}
            >
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, transparent 25%, rgba(255,255,255,.55) 45%, transparent 60%)", mixBlendMode: "soft-light" }} />
              <Chip bg="rgba(255,255,255,.88)" color="#2B2440" style={{ position: "absolute", top: 16, left: 16, height: 28, padding: "0 12px", fontSize: 13 }}>TODO · official portrait</Chip>
            </div>
            <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-[18px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-ink-500">
                  <span className="block h-5 w-5 rounded-md" style={{ background: "var(--accent)", border: "1px solid rgba(43,36,64,.12)" }} />
                  {color} · fan-picked color
                </span>
                <Chip bg="var(--surface)" color="var(--ink-500)" style={{ border: "1px dashed var(--line)", height: 28, padding: "0 12px", fontSize: 13 }}>Symbol · TODO</Chip>
              </div>
              <h1 className="disp m-0 font-bold" style={{ fontSize: "clamp(72px, 10vw, 140px)", lineHeight: 0.9, letterSpacing: "-0.04em", color: "var(--accent-deep)" }}>{member.stage_name}</h1>
              {member.name_ko && <p className="m-0 text-[28px] font-medium">{member.name_ko}</p>}
              <div className="flex flex-wrap gap-2">
                {positions.map((p) => <Chip key={p} bg="var(--accent)" color="#2B2440" style={{ height: 28, padding: "0 12px", fontSize: 13 }}>{p}</Chip>)}
              </div>
              <blockquote className="relative m-0 mt-2 rounded-2xl bg-surface px-5 py-4 text-base leading-relaxed text-ink-500">
                <span className="absolute -top-2.5 left-4"><HeartIcon size={22} fill="var(--accent)" /></span>
                [INTRO QUOTE · add only a verified, sourced quote, never a written one]
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-[72px] px-6 pb-16 pt-6">
        {/* 2 PROFILE INFO */}
        <section aria-labelledby="pi" className="glass rounded-card p-8" style={{ boxShadow: "0 8px 24px var(--accent-soft)" }}>
          <h2 id="pi" className="disp m-0 mb-5 text-[28px] font-semibold">Profile</h2>
          <dl className="m-0 grid gap-x-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
            {info.map((r) => (
              <div key={r.k} className="flex justify-between gap-4 border-b border-line py-3.5">
                <dt className="text-sm text-ink-500">{r.k}</dt>
                <dd className="m-0 inline-flex items-center gap-2 text-right font-semibold" style={{ color: r.muted ? "var(--ink-500)" : "inherit" }}>
                  {r.star && <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" style={{ fill: "var(--accent-deep)" }} /></svg>}
                  {r.v}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 3 FUN FACTS */}
        {facts.length > 0 && (
          <section aria-labelledby="ff">
            <h2 id="ff" className="disp m-0 mb-2 text-[32px] font-semibold">Fun facts</h2>
            <div className={styles.hscroll}>
              {facts.map((t, k) => (
                <div key={t} className={styles.sticker} style={{ flex: "0 0 280px", transform: `rotate(${STICKER_ROT[k % 4]}deg)`, background: k % 2 ? "#FFFFFF" : color, borderRadius: 20, padding: 22, boxShadow: "0 10px 0 -4px rgba(43,36,64,.08), 0 14px 24px rgba(43,36,64,.08)", border: "3px solid #fff", display: "flex", flexDirection: "column", gap: 12, color: "#2B2440" }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,.75)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d={STICKER_ICONS[k % 3]} fill="#2B2440" /></svg>
                  </span>
                  <span className="text-base font-medium leading-[1.55]">{t}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4 GALLERY */}
        <section aria-labelledby="gl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 id="gl" className="disp m-0 text-[32px] font-semibold">Gallery</h2>
            <span className="text-[13px] text-ink-500">Click to open · arrow keys to browse · photos TODO from official channels</span>
          </div>
          <MemberGallery color={color} />
        </section>

        {/* 5 FEATURED SONGS */}
        {songs.length > 0 && (
          <section aria-labelledby="fs" className="flex flex-wrap gap-8">
            <div className="flex flex-[1_1_260px] flex-col gap-2.5">
              <h2 id="fs" className="disp m-0 text-[32px] font-semibold">Featured songs</h2>
              <p className="m-0 text-[15px] leading-relaxed text-ink-500">Tracks where {member.stage_name} has a notable part. Part notes come from official line distribution or credits only.</p>
            </div>
            <FeaturedSongs songs={songs} />
          </section>
        )}

        {/* 6 TIMELINE */}
        {timeline.length > 0 && (
          <section aria-labelledby="tl">
            <h2 id="tl" className="disp m-0 mb-6 text-[32px] font-semibold">Timeline</h2>
            <ol className="m-0 flex max-w-[720px] list-none flex-col p-0 pl-2">
              {timeline.map((t, k) => (
                <li key={`${t.when}-${t.title}`} className="grid gap-5" style={{ gridTemplateColumns: "24px minmax(0, 1fr)" }}>
                  <span className="flex flex-col items-center">
                    <span className="mt-1 block h-4 w-4 flex-none rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 0 4px var(--cream-50), 0 0 0 6px var(--accent)" }} />
                    {k < timeline.length - 1 && <span className="w-0.5 flex-1" style={{ background: "var(--accent)", opacity: 0.5 }} />}
                  </span>
                  <span className="flex flex-col gap-1 pb-7">
                    <span className="text-[13px] font-semibold tracking-[0.04em]" style={{ color: "var(--accent-deep)" }}>{t.when}</span>
                    <span className="disp text-xl font-semibold">{t.title}</span>
                    <span className="text-[15px] leading-normal text-ink-500">{t.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* 7 PHOTOCARD COLLECTION */}
        {eras.length > 0 && (
          <section aria-labelledby="pc">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 id="pc" className="disp m-0 text-[32px] font-semibold">Photocard collection</h2>
              <span className="text-[13px] text-ink-500">One card per era · click to flip</span>
            </div>
            <EraCards name={member.stage_name} cards={eras.map((e, k) => ({ era: e.title, dateLabel: fmtDate(e.date), grad: eraGrad(k) }))} />
          </section>
        )}

        {/* 8 BOTTOM NAV */}
        <nav aria-label="Members" className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <Link href={`/members/${prev.slug}`} className={`btn btn-s ${styles.accentS}`} style={{ minHeight: 64, padding: "0 20px 0 10px", gap: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: memberGrad(prev.color_hex), display: "block", border: "2px solid #fff" }} />
            <span className="flex flex-col items-start gap-0.5"><span className="font-sans text-[11px] font-medium text-ink-500">Previous</span>{prev.stage_name}</span>
          </Link>
          <Link href="/members" className="btn" style={{ color: "var(--ink-500)", background: "transparent" }}>Back to all members</Link>
          <Link href={`/members/${next.slug}`} className={`btn btn-s ${styles.accentS}`} style={{ minHeight: 64, padding: "0 10px 0 20px", gap: 12 }}>
            <span className="flex flex-col items-end gap-0.5"><span className="font-sans text-[11px] font-medium text-ink-500">Next</span>{next.stage_name}</span>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: memberGrad(next.color_hex), display: "block", border: "2px solid #fff" }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </Link>
        </nav>
      </div>
    </div>
  );
}
