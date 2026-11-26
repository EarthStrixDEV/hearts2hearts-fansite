// Row types for migration 0010 (fan club). Hand-written like types.ts: timestamps are ISO strings
// (select to_json(col) #>> '{}' as col), dates are 'YYYY-MM-DD'. Keep in sync with db/migrations/0010_fan.sql.
import type { ContentStatus } from "./types";

export interface FandomSetting { name: string; name_native: string; color: string; debut_date: string }

export interface FanProfileRow {
  user_id: string; nickname: string; bias_member_id: string | null; theme_mode: "bias" | "era";
  era_album_id: string | null; joined_fandom_at: string; created_at: string;
}

export interface CountdownTeaser { label: string; unlock_at: string | null; media_id: string | null }
export interface CountdownRow {
  id: string; title: string; kind: "comeback" | "anniversary" | "release"; target_at: string;
  album_id: string | null; teasers: CountdownTeaser[]; status: ContentStatus; updated_at: string;
}

export interface LiveRoomRow { id: string; countdown_id: string; opens_at: string; closes_at: string; slow_mode_sec: number; cheers: string }
export interface LiveMessageRow { id: string; room_id: string; user_id: string; body: string; is_hidden: boolean; created_at: string }

export type NoticeJobState = "queued" | "reading" | "done" | "failed";
export interface NoticeItem { title_ko: string; title_th: string; starts_at: string | null; confidence: number }
export interface NoticeJobRow {
  id: string; user_id: string; image_id: string; state: NoticeJobState; model: string | null;
  result: NoticeItem[] | null; error: string | null; created_at: string;
}
export type ReminderKind = "1h" | "15m" | "vote";
export interface EventReminderRow { user_id: string; job_id: string; item_index: number; remind_at: string; kind: ReminderKind; sent_at: string | null }

export interface PhotocardRow { id: string; album_id: string; member_id: string; version: string; image_id: string | null; sort_order: number; status: ContentStatus }
export type FanCardState = "have" | "want";
export interface FanCardRow { user_id: string; photocard_id: string; state: FanCardState; updated_at: string }

export type TradeState = "pending" | "accepted" | "shipped" | "done" | "cancelled";
export interface TradeRequestRow {
  id: string; from_user: string; to_user: string; give_card_id: string; get_card_id: string; state: TradeState;
  tracking_no: string | null; shipped_by: string | null; rating_from: number | null; rating_to: number | null; created_at: string;
}

export type CapsulePaper = "sky" | "blush" | "lilac" | "lemon";
export interface CapsuleLetterRow {
  id: string; user_id: string; to_kind: "group" | "self"; paper: CapsulePaper; body: string; open_at: string;
  fanbook_opt_in: boolean; created_at: string;
}
/** app.my_capsules(): metadata only, never the body. */
export type CapsuleSummary = Pick<CapsuleLetterRow, "id" | "to_kind" | "paper" | "created_at" | "open_at">;

export type FanActivityKind = "stream_log" | "mission" | "card" | "live_attend" | "login";
export interface FanActivityRow { id: string; user_id: string; kind: FanActivityKind; ref_id: string | null; amount: number; created_at: string }

export interface UnlockRule { kind: FanActivityKind; count: number }
export interface RoomItemRow { id: string; slug: string; name: string; unlock_rule: UnlockRule; model_id: string | null; status: ContentStatus }
export interface FanRoomItemRow {
  user_id: string; item_id: string; unlocked_at: string; placed: boolean; placement: { x: number; y: number; z: number; rot: number } | null;
}
