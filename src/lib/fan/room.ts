// Pure rules for "my room" (/fan/room): placement validation, unlock-rule wording and progress, and the place / remove toggle.
// No React, no database, so it is unit-testable and shared by the server action and the client UI.
import { z } from "zod";
import type { FanActivityKind } from "@/lib/db/fan-types";

/** The floor spans x, z in [-ROOM_HALF, ROOM_HALF]; y is the elevation of the item's base (walls are ROOM_HEIGHT tall). */
export const ROOM_HALF = 3;
export const ROOM_HEIGHT = 4;

const range = (min: number, max: number) => z.number().min(min).max(max);

/** `fan_room_items.placement`. `rot` is degrees around the vertical axis. z.number() already rejects NaN and Infinity. */
export const Placement = z.object({
  x: range(-ROOM_HALF, ROOM_HALF),
  y: range(0, ROOM_HEIGHT),
  z: range(-ROOM_HALF, ROOM_HALF),
  rot: range(-360, 360),
});
export type Placement = z.infer<typeof Placement>;

/** `room_items.unlock_rule`. The DB check allows `count` to be a JSON number or numeric string, hence the coercion. */
export const UnlockRuleSchema = z.object({
  kind: z.enum(["stream_log", "mission", "card", "live_attend", "login"]),
  count: z.coerce.number().int().min(1),
});
export type UnlockRule = { kind: FanActivityKind; count: number };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const RULE_TEXT: Record<FanActivityKind, (n: number) => string> = {
  login: (n) => (n === 1 ? "Log in once" : `Log in on ${n} different days`),
  mission: (n) => (n === 1 ? "Complete a fandom mission" : `Complete ${n} fandom missions`),
  card: (n) => `Collect ${n} ${plural(n, "photocard", "photocards")} in your binder`,
  live_attend: (n) => (n === 1 ? "Join a live waiting room" : `Join ${n} live waiting rooms`),
  stream_log: (n) => `Log ${n} streaming ${plural(n, "minute", "minutes")}`,
};

export const ruleText = (rule: UnlockRule): string => RULE_TEXT[rule.kind](rule.count);

/** `totals` = sum of fan_activity.amount per kind, the same sum app.log_fan_activity() compares with `count`. */
export function ruleProgress(rule: UnlockRule, totals: Partial<Record<FanActivityKind, number>>): { have: number; need: number } {
  return { have: Math.min(totals[rule.kind] ?? 0, rule.count), need: rule.count };
}

// Where each seeded item goes when it is first placed (positions follow the MyRoom artboard). Left wall is x = -ROOM_HALF,
// right wall is z = -ROOM_HALF; wall items sit just inside the room, rotated to face it.
const SPOTS: Record<string, Placement> = {
  "sky-blue-rug": { x: 0, y: 0, z: 0.3, rot: 0 },
  "lemon-tang-poster": { x: -2.93, y: 1.4, z: -0.4, rot: 90 },
  "bias-card-frame": { x: 1.5, y: 1.5, z: -2.93, rot: 0 },
  "fairy-lights": { x: 0, y: 3.55, z: 0, rot: 0 },
  "album-shelf": { x: -0.2, y: 1.0, z: -2.7, rot: 0 },
  "lightstick-lamp": { x: -1.5, y: 0, z: 1.3, rot: 0 },
  "i-was-here-badge": { x: 1.5, y: 0.05, z: 1.2, rot: 0 },
};

/** First placement of an item: its artboard spot, or a free-standing grid slot for slugs the design does not know. */
export function defaultPlacement(slug: string, slot: number): Placement {
  return SPOTS[slug] ?? { x: -2 + (slot % 3) * 2, y: 0, z: -2 + (Math.floor(slot / 3) % 3) * 2, rot: 0 };
}

export interface PlaceableItem { id: string; slug: string; placed: boolean; placement: Placement | null }

/**
 * Flips one item between "in room" and "in inventory". Placing reuses the stored placement (kept when removed) or the default
 * spot; removing keeps the placement so placing again returns it to the same place. null = unknown id.
 */
export function togglePlacement<T extends PlaceableItem>(
  items: readonly T[],
  id: string,
): { items: T[]; change: { placed: boolean; placement: Placement | null } } | null {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  const placed = !item.placed;
  const placement = placed ? (item.placement ?? defaultPlacement(item.slug, items.filter((i) => i.placed).length)) : item.placement;
  return {
    items: items.map((i) => (i.id === id ? { ...i, placed, placement } : i)),
    change: { placed, placement: placed ? placement : null },
  };
}
