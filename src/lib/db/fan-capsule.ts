import { randomUUID } from "node:crypto";
import { withUser } from "./fan-client";
import type { CapsulePaper, CapsuleSummary } from "./fan-types";
import type { SealInput } from "@/lib/fan/capsule";

// Time capsule data layer. Everything runs as `fan_app` through withUser(), so RLS applies: a letter is sealed until open_at,
// never editable, and the author only ever sees metadata (app.my_capsules()) before it opens.

export interface ShelfLetter { id: string; toKind: "group" | "self"; paper: CapsulePaper; createdAt: string; openAt: string }

/**
 * Seals a letter. The id is generated here and the insert has NO `returning`: the new row is not selectable until open_at, so
 * RETURNING would fail the select policy. The fan book opt-in only applies to letters to the group.
 */
export async function sealLetter(userId: string, letter: SealInput, openAt: Date): Promise<string> {
  const id = randomUUID();
  await withUser(userId, (q) =>
    q(
      "insert into capsule_letters (id, user_id, to_kind, paper, body, open_at, fanbook_opt_in) values ($1, $2, $3, $4, $5, $6, $7)",
      [id, userId, letter.toKind, letter.paper, letter.body, openAt.toISOString(), letter.toKind === "group" && letter.fanbookOptIn],
    ),
  );
  return id;
}

/** The fan's own letters, newest first. Metadata only (app.my_capsules() never returns the body). */
export async function listMyLetters(userId: string): Promise<ShelfLetter[]> {
  const rows = await withUser(userId, (q) =>
    q<{ id: string; to_kind: CapsuleSummary["to_kind"]; paper: CapsulePaper; created_at: string; open_at: string }>(
      `select id, to_kind, paper, to_json(created_at) #>> '{}' as created_at, to_json(open_at) #>> '{}' as open_at
         from app.my_capsules()`,
    ),
  );
  return rows.map((r) => ({ id: r.id, toKind: r.to_kind, paper: r.paper, createdAt: r.created_at, openAt: r.open_at }));
}

/** Letters to the group whose authors opted in to the fan book (migration 0014: one aggregate, no rows). */
export async function countFanbookLetters(userId: string | null): Promise<number> {
  const rows = await withUser(userId, (q) => q<{ n: number }>("select app.fandom_capsule_count() as n"));
  return rows[0]?.n ?? 0;
}
