import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CapsuleStudio, type CapsuleStudioProps, type ShelfEntry } from "@/components/fan/capsule/CapsuleStudio";
import { getFandom, getOrCreateFanMe } from "@/lib/db/fan";
import { countFanbookLetters, listMyLetters } from "@/lib/db/fan-capsule";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";
import { daysUntil, formatDayZoned, nextAnniversary, ordinal } from "@/lib/fan/anniversary";
import { GROUP_NAME } from "@/lib/fan/capsule";
import { formatZoned, ICT, KST } from "@/lib/fan/time";
import { sealCapsule } from "./actions";

export const metadata: Metadata = { title: "Time capsule" };
// Personal and time based (days left, locked or opened): rendered per request.
export const dynamic = "force-dynamic";

async function sessionUserId(): Promise<string | null> {
  try {
    return await getSessionUserId();
  } catch (e) {
    // Neon Auth env missing or the session lookup failed: treat as signed out
    console.error("capsule: session unavailable", e);
    return null;
  }
}

async function loadCapsule(userId: string): Promise<Omit<CapsuleStudioProps, "seal">> {
  const now = Date.now();
  const [fandom, me, letters, fandomCount] = await Promise.all([getFandom(), getOrCreateFanMe(userId), listMyLetters(userId), countFanbookLetters(userId)]);
  const next = nextAnniversary(fandom.debut_date, now);

  const shelf: ShelfEntry[] = letters.map((l) => ({
    id: l.id,
    to: l.toKind === "group" ? GROUP_NAME : "Future me",
    paper: l.paper,
    sealedOn: formatDayZoned(l.createdAt, ICT),
    locked: Date.parse(l.openAt) > now,
  }));

  return {
    nickname: me.nickname,
    anniversary: ordinal(next.number),
    openLabel: formatDayZoned(next.openAt, KST),
    whenText: `${formatZoned(next.openAt, KST)} KST, which is ${formatZoned(next.openAt, ICT)} in Thailand (ICT)`,
    daysLeft: daysUntil(next.openAt, now),
    fandomCount,
    shelf,
  };
}

export default async function CapsulePage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/auth/sign-in");
  if (!hasFanDb()) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px" }}>
        <h1 className="disp" style={{ fontSize: 28, fontWeight: 600 }}>The time capsule is resting</h1>
        <p style={{ color: "var(--ink-500)" }}>Letters can’t be sealed right now. Please come back a little later.</p>
        <Link href="/fan">← S2U hub</Link>
      </main>
    );
  }
  return <CapsuleStudio {...await loadCapsule(userId)} seal={sealCapsule} />;
}
