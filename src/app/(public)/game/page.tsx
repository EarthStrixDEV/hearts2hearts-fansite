import type { Metadata } from "next";
import { GameCanvas } from "@/components/game/GameCanvas";
import { getGameData } from "@/lib/db/game";
import "./game.css";

export const metadata: Metadata = {
  title: "Game",
  description: "How well do you know Hearts2Hearts? Quiz and memory match built from verified facts.",
};

// Static shell: cards + catalog come from the `game` cache tag; the leaderboard is fetched client-side from /api/game/score.
// Quiz questions are NOT sent here (they carry the answers): each round fetches its own from /api/game/quiz/start.
export default async function GamePage() {
  const { cards, catalog } = await getGameData();
  return <GameCanvas data={{ cards, catalog }} />;
}
