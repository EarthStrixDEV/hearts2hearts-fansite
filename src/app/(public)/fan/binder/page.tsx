import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BinderBoard } from "@/components/fan/binder/BinderBoard";
import { getBinderCards, getMyTrades, getTradeMatches, listBinderAlbums } from "@/lib/db/fan-binder";
import { hasFanDb } from "@/lib/db/fan-client";
import { getSessionUserId } from "@/lib/db/fan-session";

export const metadata: Metadata = { title: "Photocard binder" };
// Personal data: rendered per request, never cached.
export const dynamic = "force-dynamic";

export default async function BinderPage({ searchParams }: { searchParams: Promise<{ album?: string | string[] }> }) {
  let userId: string | null = null;
  if (hasFanDb()) {
    try {
      userId = await getSessionUserId();
    } catch (e) {
      console.error("binder: session unavailable", e); // auth env missing: treat as signed out
    }
  }
  if (!userId) redirect("/auth/sign-in");

  const { album } = await searchParams;
  const albums = await listBinderAlbums(userId);
  // default = the latest album that has cards; an unknown ?album= falls back to it too
  const selected = albums.find((a) => a.id === (Array.isArray(album) ? album[0] : album)) ?? albums[0] ?? null;
  const [cards, matches, trades] = await Promise.all([
    selected ? getBinderCards(userId, selected.id) : Promise.resolve([]),
    getTradeMatches(userId, selected?.id ?? null, 3),
    getMyTrades(userId),
  ]);

  return <BinderBoard key={selected?.id ?? "none"} albums={albums} albumId={selected?.id ?? null} cards={cards} matches={matches} trades={trades} />;
}
