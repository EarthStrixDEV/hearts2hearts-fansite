import { CityTeaser } from "@/components/home/CityTeaser";
import { EraCarousel } from "@/components/home/EraCarousel";
import { BlogCards, EventBanner, Hero, LatestRelease, SectionHead } from "@/components/home/HomeSections";
import { MusicWidget } from "@/components/home/MusicWidget";
import { TiltCards } from "@/components/home/TiltCards";
import { toCardData } from "@/components/members/profile";
import { Button } from "@/components/ui/Button";
import { getHomeData } from "@/lib/db/home";

const SECTION = "mx-auto max-w-[1200px] px-6";

export default async function HomePage() {
  const { slides, members, release, top5, posts, nextEvent } = await getHomeData();
  return (
    <>
      <Hero />
      {release && <LatestRelease release={release} />}

      {slides.length > 0 && (
        <section id="eras" className="py-12">
          <EraCarousel slides={slides} />
        </section>
      )}

      {members.length > 0 && (
        <section id="cards" className={`${SECTION} py-12`}>
          <SectionHead eyebrow="Photocards" title="Tilt it. Flip it. Collect it." className="mb-8" action={<Button href="/members" variant="secondary">All members</Button>} />
          <TiltCards cards={members.map(toCardData)} />
          <p className="mt-5 text-[13px] text-ink-500">Card colors are fan-picked for this site, not official member colors. Swipe sideways on a phone.</p>
        </section>
      )}

      {top5.length > 0 && (
        <section id="music" className={`${SECTION} py-12`}>
          <SectionHead
            eyebrow="Music"
            title="Top 5 right now"
            action={
              <Button href="/music" variant="secondary">
                See all music
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Button>
            }
          />
          <MusicWidget tracks={top5} />
        </section>
      )}

      {nextEvent && <EventBanner event={nextEvent} />}

      {posts.length > 0 && (
        <section id="blog" className={`${SECTION} py-12`}>
          <SectionHead eyebrow="AI daily blog" title="Fresh fan notes" action={<Button href="/blog" variant="secondary">All posts</Button>} />
          <BlogCards posts={posts} />
        </section>
      )}

      <section id="city" className={`${SECTION} pb-[72px] pt-12`}>
        <CityTeaser />
      </section>
    </>
  );
}
