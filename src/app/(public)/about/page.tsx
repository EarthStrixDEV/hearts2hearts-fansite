import type { Metadata } from "next";
import Link from "next/link";
import { GroupInfo, OfficialLinks, StoryTimeline } from "@/components/about/AboutSections";
import { Chip } from "@/components/ui/Chip";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { getAboutContent } from "@/lib/db/pages";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const about = await getAboutContent();
  return (
    <>
      {/* 1 HERO */}
      <section className="relative overflow-hidden px-6 pb-14 pt-[72px]">
        <div aria-hidden="true" className="absolute inset-0">
          <span className="floaty absolute" style={{ left: "8%", top: "30%" }}><HeartIcon size={34} fill="#FFB6D5" /></span>
          <span className="floaty absolute" style={{ right: "10%", top: "20%", animationDelay: "-2s" }}><HeartIcon size={24} fill="#C9B6FF" /></span>
          <span className="floaty absolute" style={{ right: "34%", bottom: "14%", animationDelay: "-4s" }}><HeartIcon size={20} fill="#A8D8FF" /></span>
          <div className="absolute rounded-full" style={{ width: 640, height: 640, left: "50%", top: -360, marginLeft: -320, background: "radial-gradient(circle, rgba(201,182,255,.55), rgba(201,182,255,0) 70%)" }} />
        </div>
        <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-5 text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
            <Link href="/" className="fx text-ink-500 no-underline">Home</Link> / <span aria-current="page" className="font-semibold text-ink-900">About</span>
          </nav>
          <div className="flex h-[120px] w-[220px] items-center justify-center rounded-card" style={{ border: "2px dashed rgba(201,42,104,.35)", background: "rgba(255,255,255,.5)" }}>
            <Chip bg="#fff" color="#2B2440">TODO · official group logo</Chip>
          </div>
          <h1 className="disp holo-text m-0 font-bold leading-[1.02] tracking-[-0.02em]" style={{ fontSize: "clamp(48px, 7vw, 84px)" }}>{about.title}</h1>
          <p className="m-0 max-w-[48ch] text-xl leading-relaxed text-ink-500">{about.nameStory}</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-16 px-6 pb-[72px]">
        <GroupInfo info={about.info} />
        <StoryTimeline story={about.story} />
        <OfficialLinks links={about.links} />

        {/* 5 ABOUT THIS SITE */}
        <section aria-labelledby="as" className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
          <div className="flex flex-col gap-3.5">
            <h2 id="as" className="disp m-0 text-[32px] font-semibold">About this site</h2>
            {about.siteParagraphs.map((p) => <p key={p} className="m-0 text-base leading-[1.8] text-ink-500">{p}</p>)}
          </div>
          <div className="glass flex flex-col gap-3 rounded-card p-6">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500">Built with</span>
            <div className="flex flex-wrap gap-2">
              {about.builtWith.map((b) => <Chip key={b.label} bg={b.bg} color="#2B2440">{b.label}</Chip>)}
            </div>
          </div>
        </section>

        {/* 6 DISCLAIMER */}
        <section role="note" className="flex items-start gap-4 rounded-card bg-surface px-7 py-6" style={{ border: "1.5px dashed rgba(201,42,104,.4)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C92A68" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 flex-none"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
          <p className="m-0 text-[15px] leading-[1.7] text-ink-500"><strong className="text-ink-900">Disclaimer.</strong> {about.disclaimer}</p>
        </section>
      </div>
    </>
  );
}
