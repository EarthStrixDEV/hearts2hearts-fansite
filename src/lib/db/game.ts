import "server-only";
import { unstable_cache } from "next/cache";
import { hasDb, query } from "@/lib/neon/db";
import { CURRENT_SEASON } from "@/components/game/rules";
import {
  GAME_CATALOG,
  SEED_CARDS,
  SEED_QUESTIONS,
  type CardPayload,
  type GameCatalogEntry,
  type QuestionPayload,
} from "./seed/game";

export const GAME_TAG = "game";
export const MEMORY_PAIRS = 8;

export interface GameData {
  questions: QuestionPayload[];
  cards: CardPayload[];
  catalog: GameCatalogEntry[];
}
export interface LeaderboardRow { rank: number; name: string; score: number; played_at: string }

const isQuestion = (p: Record<string, unknown>): boolean =>
  typeof p.text === "string" && Array.isArray(p.options) && typeof p.answer === "string" && p.options.includes(p.answer);
const isCard = (p: Record<string, unknown>): boolean => typeof p.name === "string" && typeof p.color_hex === "string";

/** Locks a game in the hub when its content is missing (empty DB). */
function withAvailability(questions: QuestionPayload[], cards: CardPayload[]): GameData {
  const catalog = GAME_CATALOG.map((g) => {
    if (g.key === "quiz" && questions.length === 0) return { ...g, locked: true, cta: "No questions yet" };
    if (g.key === "memory" && cards.length !== MEMORY_PAIRS) return { ...g, locked: true, cta: "No cards yet" };
    return g;
  });
  return { questions, cards, catalog };
}

const loadGameItems = unstable_cache(
  async (): Promise<GameData> => {
    // No database configured: run on the design's seed data. With a database, an empty table means empty states (games locked).
    if (!hasDb()) return withAvailability(SEED_QUESTIONS.map((i) => i.payload), SEED_CARDS.map((i) => i.payload));
    try {
      const rows = await query<{ kind: string; payload: Record<string, unknown> }>(
        "select kind, payload from game_items where is_active order by sort_order, id",
      );
      const questions = rows.filter((r) => r.kind === "question" && isQuestion(r.payload)).map((r) => r.payload as unknown as QuestionPayload);
      const cards = rows.filter((r) => r.kind === "card" && isCard(r.payload)).map((r) => r.payload as unknown as CardPayload);
      return withAvailability(questions, cards);
    } catch (e) {
      console.error("getGameData failed", e);
      return withAvailability([], []);
    }
  },
  ["game-items"],
  { tags: [GAME_TAG], revalidate: 300 },
);

export const getGameData = (): Promise<GameData> => loadGameItems();

/** Top scores for the season: each fan's best round, banned fans excluded. Joins profiles.display_name. */
export const getTopScores = unstable_cache(
  async (limit = 10): Promise<LeaderboardRow[]> => {
    if (!hasDb()) return [];
    try {
      const rows = await query<{ score: number; played_at: Date; display_name: string | null }>(
        `select score, played_at, display_name from (
           select distinct on (s.user_id) s.score, s.played_at, p.display_name
           from game_scores s join profiles p on p.id = s.user_id
           where s.season = $1 and not p.is_banned
           order by s.user_id, s.score desc, s.played_at asc
         ) best
         order by score desc, played_at asc
         limit $2`,
        [CURRENT_SEASON, limit],
      );
      return rows.map((r, i) => ({ rank: i + 1, name: r.display_name?.trim() || "S2U", score: r.score, played_at: new Date(r.played_at).toISOString() }));
    } catch (e) {
      console.error("getTopScores failed", e);
      return [];
    }
  },
  ["game-top-scores"],
  { tags: [GAME_TAG], revalidate: 60 },
);
