import "server-only";
import type { Member, MemberFact } from "@/lib/db/types";
import { query, queryOne, hasDb } from "@/lib/neon/db";
import { cleanQ } from "../db";
import { likeOf, MEMBER_COLS, Where } from "../sql";

export interface MemberRow extends Member { fact_count: number }

const STATUSES = ["draft", "published", "archived"];

export async function listMembers(q?: string, status?: string): Promise<MemberRow[]> {
  if (!hasDb()) return [];
  const w = new Where();
  if (status && STATUSES.includes(status)) w.add("status = ?", status);
  const s = cleanQ(q);
  if (s) w.add("(stage_name ilike ? or name_ko ilike ? or real_name ilike ?)", likeOf(s));
  return query<MemberRow>(
    `select ${MEMBER_COLS}, (select count(*)::int from member_facts f where f.member_id = members.id) as fact_count
       from members ${w.clause} order by sort_order, stage_name`,
    w.params,
  );
}

export async function getMember(id: string): Promise<{ member: Member; facts: MemberFact[] } | null> {
  if (!hasDb() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const member = await queryOne<Member>(`select ${MEMBER_COLS} from members where id = $1`, [id]);
  if (!member) return null;
  const facts = await query<MemberFact>(`select id, member_id, label, value, sort_order from member_facts where member_id = $1 order by sort_order`, [id]);
  return { member, facts };
}

/** x/9 profile completeness shown in the list (design: "Complete" column). */
export function memberCompleteness(m: Member, factCount: number): { filled: number; total: number } {
  const checks = [m.stage_name, m.name_ko, m.real_name, m.birth_date, m.position?.length ? "y" : "", m.bio, m.avatar_id, m.cover_id, factCount ? "y" : ""];
  return { filled: checks.filter((v) => (v ?? "").toString().trim()).length, total: checks.length };
}
