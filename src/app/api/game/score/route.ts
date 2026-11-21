import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { hasDb, queryOne } from "@/lib/neon/db";
import { getCurrentUser } from "@/lib/auth/session";
import { GAME_TAG, getTopScores } from "@/lib/db/game";
import { CURRENT_SEASON, GAME_RULES, isGameKind, isValidScore } from "@/components/game/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/** GET -> season top 10 (best score per fan). Public. */
export async function GET() {
  const rows = await getTopScores(10);
  return NextResponse.json({ ok: true, season: CURRENT_SEASON, rows }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}

/**
 * POST { game: "quiz" | "memory", score: number } -> { ok, rank, score, season }
 * 1. same-origin  2. valid body + score on the game's grid and <= per-round cap  3. signed-in fan (getCurrentUser: null if signed out OR banned)
 * 4. throttle + insert in ONE statement (min round time since the fan's last score)  5. rank among fans' best scores
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    let host: string | null = null;
    try { host = new URL(origin).host; } catch {}
    if (host !== req.headers.get("host")) return err(403, "bad_origin");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "invalid_json");
  }
  const { game, score } = (body ?? {}) as { game?: unknown; score?: unknown };
  if (!isGameKind(game)) return err(400, "invalid_game");
  if (!isValidScore(game, score)) return err(422, "invalid_score");
  if (!hasDb()) return err(503, "not_configured");

  const user = await getCurrentUser();
  if (!user) return err(401, "login_required");

  // Atomic: insert only if the fan has no score newer than the game's minimum round time.
  const inserted = await queryOne<{ id: string }>(
    `insert into game_scores (user_id, season, score)
     select $1, $2, $3
     where not exists (
       select 1 from game_scores where user_id = $1 and played_at > now() - ($4::int * interval '1 millisecond')
     )
     returning id`,
    [user.id, CURRENT_SEASON, score, GAME_RULES[game].minRoundMs],
  );
  if (!inserted) return err(429, "too_fast");

  // Rank = 1 + number of other (non-banned) fans whose best score this season beats this one.
  const better = await queryOne<{ n: number }>(
    `select count(*)::int as n from (
       select s.user_id from game_scores s join profiles p on p.id = s.user_id
       where s.season = $1 and s.user_id <> $2 and not p.is_banned
       group by s.user_id having max(s.score) > $3
     ) t`,
    [CURRENT_SEASON, user.id, score],
  );

  revalidateTag(GAME_TAG, "max");
  return NextResponse.json({ ok: true, rank: (better?.n ?? 0) + 1, score, season: CURRENT_SEASON }, { status: 201 });
}
