import Link from "next/link";
import { CoverLayer } from "@/components/ui/CoverLayer";
import { Photo } from "@/components/ui/Photo";
import { coverBg, xImageSize } from "@/lib/media-url";
import type { CSSProperties, ReactNode } from "react";
import { fmtDate } from "@/components/members/profile";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { HeartIcon } from "@/components/ui/HeartIcon";
import type { HomeEvent, HomePost, HomeRelease } from "@/lib/db/home";
import type { LicensedImage } from "@/lib/db/seed/licensed-images";
import { Countdown } from "./Countdown";
import { ListenNow } from "./ListenNow";
import { Parallax } from "./Parallax";
import { Star } from "./Star";
import styles from "./home.module.css";

const SECTION = "mx-auto max-w-[1200px] px-6";

export function SectionHead({ eyebrow, title, action, className = "mb-7" }: { eyebrow: string; title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        <p className="m-0 mb-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-pink-700">{eyebrow}</p>
        <h2 className="disp m-0 text-[44px] font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const FLOATERS = [
  { x: 8, y: 22, s: 28, c: "#FF8FB8", heart: true, d: "0s", o: 0.8 }, { x: 18, y: 70, s: 18, c: "#C9B6FF", heart: true, d: "-2s", o: 0.9 },
  { x: 44, y: 14, s: 16, c: "#FFFFFF", heart: false, d: "-1s", o: 1 }, { x: 52, y: 82, s: 22, c: "#A8D8FF", heart: true, d: "-3s", o: 0.8 },
  { x: 64, y: 8, s: 20, c: "#FFB6D5", heart: true, d: "-4s", o: 0.7 }, { x: 88, y: 30, s: 14, c: "#FFFFFF", heart: false, d: "-2.2s", o: 1 },
  { x: 92, y: 74, s: 26, c: "#FF8FB8", heart: true, d: "-1.4s", o: 0.7 }, { x: 30, y: 40, s: 12, c: "#FFFFFF", heart: false, d: "-0.6s", o: 1 },
  { x: 74, y: 56, s: 14, c: "#FFFFFF", heart: false, d: "-1.8s", o: 1 }, { x: 4, y: 88, s: 16, c: "#C9B6FF", heart: false, d: "-2.6s", o: 1 },
];
const blob = (size: number, rgb: string, pos: CSSProperties) => (
  <div style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, rgba(${rgb},.7), rgba(${rgb},0) 70%)`, ...pos }} />
);

/** `photos`: official promo images for the three floating cards (centre = group), or null to keep the colour placeholders. */
/** `groupPhoto`: freely licensed group photo for the centre card when `photos.center` is empty; its credit is shown under the cards. */
export function Hero({ photos, groupPhoto }: { photos?: { left?: string | null; center?: string | null; right?: string | null }; groupPhoto?: LicensedImage | null }) {
  const group = photos?.center ? null : groupPhoto ?? null;
  return (
    <section id="top" className="relative flex min-h-[820px] items-center overflow-hidden">
      <Parallax factor={0.15} className="absolute inset-0">
        <div aria-hidden="true" className="absolute inset-0">
          {blob(620, "255,182,213", { left: -160, top: -120 })}
          {blob(560, "201,182,255", { right: -120, top: 40 })}
          {blob(520, "168,216,255", { left: "36%", bottom: -260 })}
        </div>
      </Parallax>
      <div className="grain absolute inset-0" aria-hidden="true" style={{ opacity: 0.6 }} />
      <Parallax factor={0.35} className="absolute inset-0">
        <div aria-hidden="true" className="absolute inset-0">
          {FLOATERS.map((f, k) => (
            <span key={k} className="absolute block" style={{ left: `${f.x}%`, top: `${f.y}%`, opacity: f.o }}>
              {f.heart
                ? <span className="floaty block" style={{ animationDelay: f.d }}><HeartIcon size={f.s} fill={f.c} /></span>
                : <Star className="twinkle block" size={f.s} fill={f.c} style={{ animationDelay: f.d }} />}
            </span>
          ))}
        </div>
      </Parallax>

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 pb-[120px] pt-16" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        <div className="flex flex-col gap-6">
          <span className="chip glass self-start text-[13px] text-pink-700" style={{ height: 32, padding: "0 14px" }}>
            <Star size={12} />Unofficial fan site for S2U
          </span>
          <h1 className="disp m-0 font-bold tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 7vw, 96px)", lineHeight: 0.92 }}>
            Hearts<span className="holo-text">2</span>Hearts
          </h1>
          <p className="m-0 text-xl font-medium text-ink-500">하츠투하츠 · eight hearts, one beat</p>
          <p className="m-0 max-w-[46ch] text-[17px] leading-[1.7] text-ink-500">Every era, every member, every stage, collected in one soft little corner of the internet.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ListenNow><HeartIcon size={18} fill="currentColor" />Listen Now</ListenNow>
            <Button href="/members" variant="secondary">Meet the Members</Button>
          </div>
        </div>
        <Parallax factor={-0.08} className="relative h-[520px]">
          <div aria-hidden="true" className="absolute inset-0">
            <div className="floaty absolute" style={{ left: "6%", top: 60, width: 230, aspectRatio: "3 / 4", borderRadius: 24, transform: "rotate(-9deg)", background: "linear-gradient(160deg,#FFE3F1,#FFB6D5)", boxShadow: "0 24px 48px rgba(201,42,104,.18)", border: "6px solid #fff", animationDelay: "-1s", overflow: "hidden" }}>{photos?.left && <Photo src={photos.left} />}</div>
            <div className="floaty absolute" style={{ right: "6%", top: 20, width: 230, aspectRatio: "3 / 4", borderRadius: 24, transform: "rotate(8deg)", background: "linear-gradient(160deg,#DDF0FF,#A8D8FF)", boxShadow: "0 24px 48px rgba(61,132,212,.18)", border: "6px solid #fff", animationDelay: "-3s", overflow: "hidden" }}>{photos?.right && <Photo src={photos.right} />}</div>
            <div className="floaty absolute box-border flex items-end justify-center pb-5" style={{ left: "50%", top: 120, marginLeft: -135, width: 270, aspectRatio: "3 / 4", borderRadius: 24, background: "linear-gradient(160deg,#F1EAFF,#C9B6FF 60%,#FFD6E7)", boxShadow: "0 30px 60px rgba(138,92,230,.25)", border: "6px solid #fff", overflow: "hidden" }}>
              {photos?.center ? <Photo src={photos.center} style={{ objectPosition: "88% 50%" }} />
                : group ? <Photo src={group.src} alt={group.alt} style={{ objectFit: "contain" }} />
                : <Chip bg="rgba(255,255,255,.85)" color="#2B2440">TODO · official group photo</Chip>}
            </div>
          </div>
          {group && (
            <p className="absolute bottom-0 left-0 right-0 m-0 text-center text-xs text-ink-500">
              Group photo: {group.author} · <a href={group.licenseUrl} target="_blank" rel="noopener noreferrer license" className="fx text-ink-500">{group.license}</a> · via{" "}
              <a href={group.sourceUrl} target="_blank" rel="noopener noreferrer" className="fx text-ink-500">Wikimedia Commons</a>
            </p>
          )}
        </Parallax>
      </div>
      <a href="#release" className={`fx absolute bottom-7 left-1/2 -ml-[22px] flex h-11 w-11 items-center justify-center rounded-full text-ink-500 ${styles.bob}`} aria-label="Scroll to latest release">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </a>
    </section>
  );
}

export function LatestRelease({ release }: { release: HomeRelease }) {
  return (
    <section id="release" className={`${SECTION} pb-12 pt-6`}>
      <div className="glass flex flex-wrap items-center gap-7 rounded-card p-5 shadow-pink">
        <div className="relative h-[168px] w-[168px] flex-none rounded-2xl" style={{ background: release.coverUrl ? `center / cover no-repeat url("${xImageSize(release.coverUrl, "medium")}")` : release.grad, boxShadow: "0 16px 32px rgba(201,42,104,.2)" }}>
          {!release.coverUrl && <Chip bg="rgba(255,255,255,.85)" color="#2B2440" style={{ position: "absolute", left: 8, bottom: 8 }}>TODO · cover</Chip>}
        </div>
        <div className="flex flex-[1_1_280px] flex-col gap-2">
          <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-pink-700">Latest release</span>
          <span className="disp text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">{release.title}</span>
          <span className="text-[15px] text-ink-500">{release.typeLabel}{release.releaseDate ? ` · ${fmtDate(release.releaseDate, "long")}` : ""}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {release.spotifyUrl && (
            <Button href={release.spotifyUrl}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" /></svg>
              Play on Spotify
            </Button>
          )}
          <Button href="/music" variant="secondary">Release details</Button>
        </div>
      </div>
    </section>
  );
}

export function EventBanner({ event }: { event: HomeEvent }) {
  return (
    <section className={`${SECTION} py-8`}>
      <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-card px-10 py-9 text-[#2B2440] max-sm:px-6" style={{ background: "var(--holo)" }}>
        <div className="grain absolute inset-0" aria-hidden="true" style={{ opacity: 0.8 }} />
        <div className="relative flex min-w-[240px] flex-col gap-1.5">
          <Chip bg="#2B2440" color="#fff" className="self-start">Next event</Chip>
          <span className="disp text-[32px] font-semibold">{event.title}</span>
          <span className="text-[15px]">{event.place}</span>
        </div>
        <Countdown startsAt={event.startsAt} />
        <Button href="/schedule" className="relative">Full schedule</Button>
      </div>
    </section>
  );
}

export function BlogCards({ posts }: { posts: HomePost[] }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
      {posts.map((p) => (
        <Link key={p.href + p.title} href={p.href} className="card-l fx glass flex flex-col overflow-hidden rounded-card text-ink-900 no-underline">
          <span className="relative block aspect-video overflow-hidden">
            <span className="zoom absolute inset-0 block"><CoverLayer src={p.cover} grad={p.grad} /></span>
            {p.isAi && <Chip bg="#2B2440" color="#fff" style={{ position: "absolute", top: 12, right: 12 }}><Star size={11} fill="#FFB6D5" />AI</Chip>}
          </span>
          <span className="flex flex-col gap-2.5 px-5 pb-5 pt-[18px]">
            <span className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Chip key={t.label} bg={t.bg} color="#2B2440">{t.label}</Chip>)}</span>
            <span className="disp clamp2 text-[21px] font-semibold leading-tight">{p.title}</span>
            <span className="clamp3 text-sm leading-relaxed text-ink-500">{p.excerpt}</span>
            <span className="text-xs text-ink-500">{fmtDate(p.publishedAt)} · {p.readMin} min read{p.isAi ? " · written by AI, fan content" : ""}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
