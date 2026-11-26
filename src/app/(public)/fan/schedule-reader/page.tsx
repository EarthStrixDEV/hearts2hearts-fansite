import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NoticeReader, type NoticeReaderProps } from "@/components/fan/notice/NoticeReader";
import { hasFanDb } from "@/lib/db/fan-client";
import { getLatestJob, getReminderKinds } from "@/lib/db/fan-notice";
import { getSessionUserId } from "@/lib/db/fan-session";
import { hasStorage, signedUrl } from "@/lib/neon/storage";

export const metadata: Metadata = { title: "AI notice reader · S2U" };
// Personal page (the signed-in fan's own readings): rendered per request.
export const dynamic = "force-dynamic";

export default async function ScheduleReaderPage() {
  let userId: string | null = null;
  try {
    userId = hasFanDb() ? await getSessionUserId() : null; // auth env may be missing
  } catch (e) {
    console.error("schedule-reader: session lookup failed", e);
  }
  if (!userId) redirect("/auth/sign-in");

  let initial: NoticeReaderProps["initial"] = null;
  let initialReminders: NoticeReaderProps["initialReminders"] = [];
  try {
    const job = await getLatestJob(userId);
    if (job && job.state !== "reading") {
      let imageUrl: string | null = null;
      if (hasStorage()) imageUrl = await signedUrl(job.imagePath).catch(() => null);
      initial = { jobId: job.id, phase: job.state === "done" ? "done" : job.state === "failed" ? "failed" : "queued", items: job.items ?? [], error: job.error, imageUrl };
      if (job.state === "done") initialReminders = await getReminderKinds(userId, job.id);
    }
  } catch (e) {
    console.error("schedule-reader: latest reading unavailable", e);
  }

  let isEditor = false;
  try {
    const { requireRole } = await import("@/lib/auth/session");
    isEditor = (await requireRole("editor")) !== null;
  } catch {
    isEditor = false;
  }

  const ready = hasStorage() && Boolean(process.env.LLM_API_KEY);
  return <NoticeReader ready={ready} isEditor={isEditor} initial={initial} initialReminders={initialReminders} />;
}
