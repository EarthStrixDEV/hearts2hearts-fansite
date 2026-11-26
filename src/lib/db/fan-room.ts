import { Placement, UnlockRuleSchema, type UnlockRule } from "@/lib/fan/room";
import { getOrCreateFanMe } from "./fan";
import { withUser } from "./fan-client";
import type { FanActivityKind } from "./fan-types";

// "My room" data (phase 8). Everything runs through withUser(userId) on `fan_app`: fan_room_items is own-rows-only under RLS and
// only app.log_fan_activity() can create a row (unlock), so this file reads the unlocks and flips `placed` / `placement`.

export interface RoomItemView {
  id: string;
  slug: string;
  name: string;
  rule: UnlockRule;
  /** Signed URL of the .glb in `media`, or null (every seeded item): the scene draws a placeholder shape. */
  modelUrl: string | null;
  unlocked: boolean;
  placed: boolean;
  placement: Placement | null;
}

export interface MyRoom {
  nickname: string;
  /** Published items, unlocked ones first. Locked = `unlocked: false`. */
  items: RoomItemView[];
  /** Sum of fan_activity.amount per kind (what unlock rules count against). */
  totals: Partial<Record<FanActivityKind, number>>;
}

interface ItemRow { id: string; slug: string; name: string; unlock_rule: unknown; model_path: string | null; unlocked: boolean; placed: boolean; placement: unknown }

async function modelUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const { hasStorage, signedUrl } = await import("@/lib/neon/storage");
    return hasStorage() ? await signedUrl(path) : null;
  } catch (e) {
    console.error("room: model url unavailable", e);
    return null; // the scene falls back to the placeholder shape
  }
}

export async function getMyRoom(userId: string): Promise<MyRoom> {
  const me = await getOrCreateFanMe(userId);
  const { rows, activity } = await withUser(userId, async (q) => ({
    rows: await q<ItemRow>(
      `select ri.id, ri.slug, ri.name, ri.unlock_rule, m.path as model_path,
              (f.item_id is not null) as unlocked, coalesce(f.placed, false) as placed, f.placement
         from room_items ri
         left join fan_room_items f on f.item_id = ri.id and f.user_id = $1
         left join media m on m.id = ri.model_id
        where ri.status = 'published'
        order by (f.item_id is null), f.unlocked_at, ri.name, ri.id`,
      [userId],
    ),
    activity: await q<{ kind: FanActivityKind; total: number }>(
      "select kind, sum(amount)::int as total from fan_activity where user_id = $1 group by kind",
      [userId],
    ),
  }));

  const items: RoomItemView[] = [];
  for (const r of rows) {
    const rule = UnlockRuleSchema.safeParse(r.unlock_rule); // the table check keeps this valid; a bad row is skipped, not fatal
    if (!rule.success) continue;
    const placement = Placement.safeParse(r.placement);
    items.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      rule: rule.data,
      modelUrl: r.unlocked ? await modelUrl(r.model_path) : null,
      unlocked: r.unlocked,
      placed: r.unlocked && r.placed,
      placement: placement.success ? placement.data : null,
    });
  }
  return { nickname: me.nickname, items, totals: Object.fromEntries(activity.map((a) => [a.kind, a.total])) };
}

/**
 * Places or removes one of the user's unlocked items. Returns false when the user has not unlocked it (no row to update).
 * Removing keeps the stored placement. The caller validates `placement` with the Placement schema.
 */
export async function setItemPlaced(userId: string, itemId: string, placed: boolean, placement: Placement | null): Promise<boolean> {
  const rows = await withUser(userId, (q) =>
    q(
      `update fan_room_items set placed = $3, placement = coalesce($4::jsonb, placement)
        where user_id = $1 and item_id = $2 returning item_id`,
      [userId, itemId, placed, placement ? JSON.stringify(placement) : null],
    ),
  );
  return rows.length === 1;
}
