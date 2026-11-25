import { query } from "@/lib/neon/db";
import { withUser } from "./fan-client";
import type { SlotState, TradeCommand, TradeState } from "@/lib/fan/binder";
import { tradeErrorMessage } from "@/lib/fan/binder";

// Photocard binder + trades (phase 4). Every user-facing function runs through withUser() on `fan_app`, so RLS applies
// (fan_cards / trade_requests are party-only, photocards are published-only). Cross-fan matching goes through the narrow
// definer functions from migration 0012. The owner client is used only by recordNewTradeMatches() (the match-trades cron).

export interface BinderAlbum { id: string; title: string; cards: number }
export interface BinderCard { id: string; memberId: string; memberName: string; color: string | null; version: string; state: SlotState }
export interface CardLabel { id: string; memberName: string; version: string }
/** The partner has `get` and wants `give` (which the viewer has). `options` = how many swaps that partner could do. */
export interface TradeMatch { partnerId: string; partnerName: string; give: CardLabel; get: CardLabel; options: number }
export interface MyTrade {
  id: string; state: TradeState; outgoing: boolean; partnerName: string; give: string; get: string;
  trackingNo: string | null; shippedByMe: boolean; myRating: number | null; theirRating: number | null; createdAt: string;
}

/** Published albums that have at least one published photocard, newest first (the first one is the default). */
export async function listBinderAlbums(userId: string): Promise<BinderAlbum[]> {
  return withUser(userId, (q) =>
    q<BinderAlbum>(
      `select a.id, a.title, count(pc.id)::int as cards
         from albums a join photocards pc on pc.album_id = a.id and pc.status = 'published'
        where a.status = 'published'
        group by a.id, a.title, a.release_date
        order by a.release_date desc nulls last, a.title`,
    ),
  );
}

/** One album's published cards with the viewer's state for each (no fan_cards row = missing). */
export async function getBinderCards(userId: string, albumId: string): Promise<BinderCard[]> {
  const rows = await withUser(userId, (q) =>
    q<{ id: string; member_id: string; stage_name: string; color_hex: string | null; version: string; state: "have" | "want" | null }>(
      `select pc.id, pc.member_id, m.stage_name, m.color_hex, pc.version, fc.state
         from photocards pc
         join members m on m.id = pc.member_id and m.status = 'published'
         left join fan_cards fc on fc.photocard_id = pc.id and fc.user_id = $1
        where pc.album_id = $2 and pc.status = 'published'
        order by pc.sort_order, m.sort_order, pc.version`,
      [userId, albumId],
    ),
  );
  return rows.map((r) => ({ id: r.id, memberId: r.member_id, memberName: r.stage_name, color: r.color_hex, version: r.version, state: r.state ?? "missing" }));
}

/** Top matches for the viewer (one per partner, most possible swaps first), in one query. Pass an album to keep both cards in it. */
export async function getTradeMatches(userId: string, albumId: string | null, limit = 3): Promise<TradeMatch[]> {
  const rows = await withUser(userId, (q) =>
    q<{ partner_id: string; partner_name: string; options: number; give_id: string; give_member: string; give_ver: string; get_id: string; get_member: string; get_ver: string }>(
      `select m.partner_id, m.partner_name, m.options,
              g.id as give_id, gm.stage_name as give_member, g.version as give_ver,
              t.id as get_id, tm.stage_name as get_member, t.version as get_ver
         from app.my_trade_matches($1, $2) m
         join photocards g on g.id = m.give_card_id join members gm on gm.id = g.member_id
         join photocards t on t.id = m.get_card_id join members tm on tm.id = t.member_id
        order by m.options desc, m.partner_id`,
      [albumId, limit],
    ),
  );
  return rows.map((r) => ({
    partnerId: r.partner_id, partnerName: r.partner_name, options: r.options,
    give: { id: r.give_id, memberName: r.give_member, version: r.give_ver },
    get: { id: r.get_id, memberName: r.get_member, version: r.get_ver },
  }));
}

/** The viewer's trades (either side), newest first, cancelled ones left out. `give`/`get` are from the viewer's point of view. */
export async function getMyTrades(userId: string): Promise<MyTrade[]> {
  const rows = await withUser(userId, (q) =>
    q<{
      id: string; state: TradeState; outgoing: boolean; partner_name: string; give: string | null; get: string | null; tracking_no: string | null;
      shipped_by_me: boolean; my_rating: number | null; their_rating: number | null; created_at: string;
    }>(
      `select t.id, t.state, (t.from_user = $1) as outgoing,
              coalesce(nullif(btrim(pf.display_name), ''), 'S2U fan') as partner_name,
              gm.stage_name || ' ver. ' || g.version as give, tm.stage_name || ' ver. ' || c.version as get,
              t.tracking_no, coalesce(t.shipped_by = $1, false) as shipped_by_me,
              case when t.from_user = $1 then t.rating_from else t.rating_to end as my_rating,
              case when t.from_user = $1 then t.rating_to else t.rating_from end as their_rating,
              to_json(t.created_at) #>> '{}' as created_at
         from trade_requests t
         join profiles pf on pf.id = case when t.from_user = $1 then t.to_user else t.from_user end
         left join photocards g on g.id = case when t.from_user = $1 then t.give_card_id else t.get_card_id end
         left join members gm on gm.id = g.member_id
         left join photocards c on c.id = case when t.from_user = $1 then t.get_card_id else t.give_card_id end
         left join members tm on tm.id = c.member_id
        where t.state <> 'cancelled'
        order by t.created_at desc limit 20`,
      [userId],
    ),
  );
  return rows.map((r) => ({
    id: r.id, state: r.state, outgoing: r.outgoing, partnerName: r.partner_name, give: r.give ?? "a card", get: r.get ?? "a card",
    trackingNo: r.tracking_no, shippedByMe: r.shipped_by_me, myRating: r.my_rating, theirRating: r.their_rating, createdAt: r.created_at,
  }));
}

/**
 * Sets one slot. `missing` deletes the row. The row is written only when the card is published (RLS hides drafts from the
 * select), and a card that becomes `have` is logged once through app.log_fan_activity('card') (idempotent per card).
 * Returns false when the card does not exist / is not published.
 */
export async function setCardState(userId: string, photocardId: string, state: SlotState): Promise<boolean> {
  return withUser(userId, async (q) => {
    if (state === "missing") {
      await q("delete from fan_cards where user_id = $1 and photocard_id = $2", [userId, photocardId]);
      return true;
    }
    const rows = await q(
      `insert into fan_cards (user_id, photocard_id, state)
       select $1, id, $3 from photocards where id = $2 and status = 'published'
       on conflict (user_id, photocard_id) do update set state = excluded.state, updated_at = now()
       returning state`,
      [userId, photocardId, state],
    );
    if (rows.length === 0) return false;
    if (state === "have") await q("select app.log_fan_activity('card', $1)", [photocardId]);
    return true;
  });
}

export type TradeResult = { ok: true; id?: string } | { ok: false; error: string };

/** Inserts a `pending` request, only when app.can_trade() says the two fans really match on exactly these cards. */
export async function sendTradeRequest(userId: string, t: { partnerId: string; giveCardId: string; getCardId: string }): Promise<TradeResult> {
  try {
    const rows = await withUser(userId, (q) =>
      q<{ id: string }>(
        `insert into trade_requests (from_user, to_user, give_card_id, get_card_id)
         select $1, $2, $3, $4 where app.can_trade($2, $3, $4)
         returning id`,
        [userId, t.partnerId, t.giveCardId, t.getCardId],
      ),
    );
    return rows[0] ? { ok: true, id: rows[0].id } : { ok: false, error: "This match is no longer available." };
  } catch (e) {
    return { ok: false, error: tradeErrorMessage((e as { code?: unknown }).code) };
  }
}

/** One lifecycle step. The WHERE clause pins the expected current state; app.trade_state_guard enforces who may do what. */
export async function updateTrade(userId: string, c: TradeCommand): Promise<TradeResult> {
  const [sql, params]: [string, unknown[]] = (() => {
    switch (c.kind) {
      case "accept": return ["update trade_requests set state = 'accepted' where id = $1 and state = 'pending' returning id", [c.id]];
      case "cancel": return ["update trade_requests set state = 'cancelled' where id = $1 and state in ('pending', 'accepted') returning id", [c.id]];
      case "ship": return ["update trade_requests set state = 'shipped', tracking_no = $2 where id = $1 and state = 'accepted' returning id", [c.id, c.trackingNo]];
      case "receive": return ["update trade_requests set state = 'done' where id = $1 and state = 'shipped' returning id", [c.id]];
      case "rate":
        return [
          `update trade_requests
              set rating_from = case when from_user = $2 then $3 else rating_from end,
                  rating_to = case when to_user = $2 then $3 else rating_to end
            where id = $1 and state = 'done' returning id`,
          [c.id, userId, c.rating],
        ];
    }
  })();
  try {
    const rows = await withUser(userId, (q) => q<{ id: string }>(sql, params));
    return rows[0] ? { ok: true, id: rows[0].id } : { ok: false, error: "This trade changed. Refresh and try again." };
  } catch (e) {
    return { ok: false, error: tradeErrorMessage((e as { code?: unknown }).code) };
  }
}

export interface NewMatchSummary { newMatches: number; users: number }

/**
 * Cron only (owner client, bypasses RLS): records every match that has no row in trade_match_notices yet and returns what is new.
 * `onlyUsers` limits it to those recipients (tests). There is no notification channel in this repo, so this is the bookkeeping half:
 * a channel sends to the returned recipients, then nothing else needs to change (the row is the "already told" marker).
 */
export async function recordNewTradeMatches(onlyUsers: string[] | null = null): Promise<NewMatchSummary & { recipients: string[] }> {
  const rows = await query<{ user_id: string }>(
    `insert into trade_match_notices (user_id, partner_id, give_card_id, get_card_id)
     select p.user_id, p.partner_id, p.give_card_id, p.get_card_id from app.trade_pairs(null, null) p
      where $1::uuid[] is null or p.user_id = any($1::uuid[])
     on conflict do nothing
     returning user_id`,
    [onlyUsers],
  );
  const recipients = [...new Set(rows.map((r) => r.user_id))];
  return { newMatches: rows.length, users: recipients.length, recipients };
}
