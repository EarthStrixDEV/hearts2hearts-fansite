import type { Metadata } from "next";
import { GameCanvas } from "@/components/game/GameCanvas";
import { getGameData } from "@/lib/db/game";
import "./game.css";

export const metadata: Metadata = {
  title: "Game",
  description: "How well do you know Hearts2Hearts? Quiz and memory match built from verified facts.",
};

// Static shell: game content comes from the `game` cache tag; the leaderboard is fetched client-side from /api/game/score.
export default async function GamePage() {
  const data = await getGameData();
  return <GameCanvas data={data} />;
}
