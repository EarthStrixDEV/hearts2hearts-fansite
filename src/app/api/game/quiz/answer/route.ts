import { NextResponse, type NextRequest } from "next/server";
import { getGameData } from "@/lib/db/game";
import { readRound, sameOrigin, signRound } from "@/lib/game-round";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/**
 * POST { token, pick: string | null } (null = the timer ran out) -> { ok, correct, answer, note, source?, token, done }
 * Grades the round's current question on the server and returns the next token (progress + correct count signed).
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return err(403, "bad_origin");

  const body = (await req.json().catch(() => null)) as { token?: unknown; pick?: unknown } | null;
  const round = readRound(body?.token);
  if (!round) return err(400, "invalid_round");
  if (round.i >= round.q.length) return err(409, "round_finished");

  const q = (await getGameData()).questions.find((x) => x.id === round.q[round.i]);
  if (!q) return err(410, "question_gone"); // edited/removed in the CMS mid-round: the client starts a new round

  const pick = body?.pick;
  if (pick !== null && !(typeof pick === "string" && q.options.includes(pick))) return err(400, "invalid_pick");

  const correct = pick === q.answer;
  const next = { ...round, i: round.i + 1, c: round.c + (correct ? 1 : 0) };
  const token = signRound(next);
  if (!token) return err(503, "not_configured");

  return NextResponse.json(
    { ok: true, correct, answer: q.answer, note: q.note, source: q.source, token, done: next.i === next.q.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
