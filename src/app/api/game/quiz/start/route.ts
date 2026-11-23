import { NextResponse, type NextRequest } from "next/server";
import { getGameData } from "@/lib/db/game";
import { currentUserId, sameOrigin, shuffled, signRound } from "@/lib/game-round";
import { GAME_RULES, type PublicQuestion } from "@/components/game/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/** POST -> { ok, token, questions } : a fresh random round. Questions carry no answer; answers are graded by /api/game/quiz/answer. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return err(403, "bad_origin");

  const bank = (await getGameData()).questions;
  const picked = shuffled(bank).slice(0, GAME_RULES.quiz.rawMax);
  if (!picked.length) return err(503, "no_questions");

  const token = signRound({ u: await currentUserId(), q: picked.map((q) => q.id), i: 0, c: 0, t: Date.now() });
  if (!token) return err(503, "not_configured");

  const questions: PublicQuestion[] = picked.map(({ id, text, options }) => ({ id, text, options }));
  return NextResponse.json({ ok: true, token, questions }, { headers: { "Cache-Control": "no-store" } });
}
