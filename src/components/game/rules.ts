// Pure scoring rules shared by the client (GameCanvas) and POST /api/game/score. No server-only imports here.
export type GameKind = "quiz" | "memory";

export const CURRENT_SEASON = "S1";
export const MAX_POINTS = 1000;

/** Points are normalised to 0..1000 per round so both games share one leaderboard. */
export const GAME_RULES: Record<GameKind, { label: string; rawMax: number; pointsPerStep: number; minRoundMs: number }> = {
  // quiz: raw = correct answers (0..5) -> 200 pts each
  quiz: { label: "Quiz", rawMax: 5, pointsPerStep: 200, minRoundMs: 3000 },
  // memory: raw = 1..8 (8 minus a move penalty, floor 1) -> 125 pts each
  memory: { label: "Memory Match", rawMax: 8, pointsPerStep: 125, minRoundMs: 8000 },
};

export const isGameKind = (v: unknown): v is GameKind => v === "quiz" || v === "memory";

export const toPoints = (game: GameKind, raw: number) =>
  Math.max(0, Math.min(GAME_RULES[game].rawMax, Math.round(raw))) * GAME_RULES[game].pointsPerStep;

/** Server-side cap + shape check: integer, on the game's point grid, <= per-round maximum. */
export function isValidScore(game: GameKind, score: unknown): score is number {
  if (typeof score !== "number" || !Number.isInteger(score)) return false;
  const r = GAME_RULES[game];
  return score >= 0 && score <= r.rawMax * r.pointsPerStep && score % r.pointsPerStep === 0;
}

export type Rarity = "Common" | "Rare" | "Holo";
export const rarityFor = (pct: number): Rarity => (pct >= 0.8 ? "Holo" : pct >= 0.5 ? "Rare" : "Common");
export const rankTitle = (pct: number) =>
  pct >= 0.8 ? "You’re a certified S2U!" : pct >= 0.5 ? "Rising S2U in training" : "Welcome, new S2U";
