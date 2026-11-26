import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveRoom, type LiveRoomProps } from "@/components/fan/live/LiveRoom";
import { safeHex } from "@/components/fan/theme";
import { getFandom } from "@/lib/db/fan";
import { hasFanDb } from "@/lib/db/fan-client";
import { getLiveView } from "@/lib/db/fan-live";
import { getSessionUserId } from "@/lib/db/fan-session";
import { formatZoned, ICT, KST } from "@/lib/fan/time";

export const metadata: Metadata = { title: "Waiting room · S2U" };
// Per request: the countdown needs the server's current time, and chat / cheers depend on who is signed in.
export const dynamic = "force-dynamic";

async function loadRoom(countdownId: string): Promise<LiveRoomProps | null> {
  const [view, fandom] = await Promise.all([getLiveView(countdownId), getFandom()]);
  if (!view) return null;

  // Guests can watch the countdown; the session only decides whether chat and cheers are offered.
  let signedIn = false;
  if (hasFanDb()) {
    try {
      signedIn = (await getSessionUserId()) !== null;
    } catch (e) {
      console.error("fan live: session unavailable, rendering as guest", e);
    }
  }

  const { countdown, room } = view;
  return {
    countdown,
    room,
    signedIn,
    fandomName: fandom.name,
    floodColor: safeHex(fandom.color, "#A8D8FF"),
    serverNow: Date.now(),
    whenText: `${formatZoned(countdown.targetAt, ICT)} in Thailand (ICT) · ${formatZoned(countdown.targetAt, KST)} KST.`,
  };
}

export default async function LivePage({ params }: { params: Promise<{ countdownId: string }> }) {
  const props = await loadRoom((await params).countdownId);
  if (!props) notFound();
  return <LiveRoom {...props} />;
}
