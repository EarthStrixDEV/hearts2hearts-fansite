import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WrappedStory } from "@/components/fan/wrapped/WrappedStory";
import s from "@/components/fan/wrapped/wrapped.module.css";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";
import { getWrappedSnapshot } from "@/lib/db/fan-wrapped";
import { buildSlides, parseYear, shareText, type WrappedData } from "@/lib/fan/wrapped";

export const metadata: Metadata = { title: "S2U Wrapped" };
// Personal and time dependent: rendered per request.
export const dynamic = "force-dynamic";

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.empty}>
      <h2 className={`disp ${s.emptyTitle}`}>{title}</h2>
      <p className={s.lede}>{children}</p>
      <Link className="btn btn-s" href="/fan">Back to the S2U hub</Link>
    </div>
  );
}

export default async function WrappedPage({ params }: { params: Promise<{ year: string }> }) {
  const currentYear = new Date().getUTCFullYear();
  const year = parseYear((await params).year, currentYear);
  if (year === null) notFound();

  let userId: string | null = null;
  try {
    userId = await getSessionUserId();
  } catch (e) {
    // auth env missing: treat as signed out
    console.error("fan wrapped: session lookup failed", e);
  }
  if (!userId) redirect("/auth/sign-in");

  let data: WrappedData | null = null;
  let failed = false;
  if (hasFanDb()) {
    try {
      data = await getWrappedSnapshot(userId, year);
    } catch (e) {
      failed = true;
      console.error("fan wrapped: could not load the snapshot", e);
    }
  }

  const slides = data ? buildSlides(data) : [];
  return (
    <div className={s.root}>
      <div className={s.col}>
        <div className={s.head}>
          <Link href="/fan" className={s.back}>← S2U hub</Link>
          <span className="lbl" style={{ color: "var(--pink-700)" }}>Yearly · every December</span>
          <h1 className={`disp ${s.h1}`}>S2U Wrapped {year}</h1>
          <p className={s.lede}>Built from your activity on this site: logins, missions, cards and live rooms. Stream minutes are not tracked yet, so they are not part of it.</p>
        </div>

        {data ? (
          <WrappedStory year={year} nickname={data.nickname} slides={slides} fandom={data.fandom} tweet={shareText(data)} />
        ) : failed || !hasFanDb() ? (
          <Empty title="Wrapped is unavailable right now">We could not load your Wrapped. Please try again in a little while.</Empty>
        ) : year === currentYear ? (
          <Empty title="Your Wrapped is not ready yet">It is built once a year, on Dec 1, from everything you did on this site that year. If you have logged some activity, check back then.</Empty>
        ) : (
          <Empty title={`No Wrapped for ${year}`}>Nothing was logged on this site for you in {year}, so there is nothing to show.</Empty>
        )}
      </div>
    </div>
  );
}
