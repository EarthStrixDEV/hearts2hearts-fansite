import type { Metadata } from "next";
import s from "@/components/schedule/schedule.module.css";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { getEvents } from "@/lib/db/events";

export const metadata: Metadata = {
  title: "Concerts & Events",
  description: "Official Hearts2Hearts dates only. Times show in your own timezone.",
};

// Upcoming/past is re-evaluated in the browser, but the initial HTML is refreshed hourly as well.
export const revalidate = 3600;

export default async function SchedulePage() {
  const events = await getEvents();

  return (
    <>
      <section className={s.head}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <span className="floaty" style={{ position: "absolute", left: "8%", top: "30%" }}><HeartIcon size={30} fill="#FFB6D5" /></span>
          <span className="floaty" style={{ position: "absolute", right: "12%", top: "22%", animationDelay: "-2s" }}><HeartIcon size={22} fill="#A8D8FF" /></span>
        </div>
        <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 className="disp holo-text" style={{ margin: 0, fontSize: "clamp(44px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Concerts &amp; Events</h1>
          <p style={{ margin: 0, fontSize: 17, color: "var(--ink-500)" }}>Official dates only. Times show in your own timezone.</p>
        </div>
      </section>
      <div className={`${s.wrap} ${s.main}`}>
        <ScheduleView events={events} nowIso={new Date().toISOString()} />
      </div>
    </>
  );
}
