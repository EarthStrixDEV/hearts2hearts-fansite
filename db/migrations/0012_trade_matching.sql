-- 12 Photocard trade matching (phase 4). Requires 0010.
-- fan_cards is own-rows-only under RLS, so matching two fans needs definer rights. The core function is owner-only (the
-- match-trades cron); fan_app gets two narrow wrappers that only ever expose the caller's own matches and the partner's display name.

-- Every (user, partner, give, get) where the user has `give` and wants `get`, and the partner has `get` and wants `give`.
-- p_user null = all users (cron). Published cards and non-banned fans only; pairs that already have an open trade are left out.
create or replace function app.trade_pairs(p_user uuid default null, p_album uuid default null)
returns table (user_id uuid, partner_id uuid, give_card_id uuid, get_card_id uuid)
language sql stable security definer set search_path = '' as $$
  select a_have.user_id, b_have.user_id, a_have.photocard_id, b_have.photocard_id
    from public.fan_cards a_have
    join public.fan_cards a_want on a_want.user_id = a_have.user_id and a_want.state = 'want'
    join public.fan_cards b_have on b_have.user_id <> a_have.user_id and b_have.state = 'have' and b_have.photocard_id = a_want.photocard_id
    join public.fan_cards b_want on b_want.user_id = b_have.user_id and b_want.state = 'want' and b_want.photocard_id = a_have.photocard_id
    join public.photocards pg on pg.id = a_have.photocard_id and pg.status = 'published'
    join public.photocards pt on pt.id = b_have.photocard_id and pt.status = 'published'
    join public.profiles ua on ua.id = a_have.user_id and not ua.is_banned
    join public.profiles ub on ub.id = b_have.user_id and not ub.is_banned
   where a_have.state = 'have'
     and (p_user is null or a_have.user_id = p_user)
     and (p_album is null or (pg.album_id = p_album and pt.album_id = p_album))
     and not exists (
       select 1 from public.trade_requests t
        where t.state in ('pending', 'accepted', 'shipped')
          and ((t.from_user = a_have.user_id and t.to_user = b_have.user_id and t.give_card_id = a_have.photocard_id and t.get_card_id = b_have.photocard_id)
            or (t.from_user = b_have.user_id and t.to_user = a_have.user_id and t.give_card_id = b_have.photocard_id and t.get_card_id = a_have.photocard_id)))
$$;

-- The caller's best match per partner, partners with the most possible swaps first.
create or replace function app.my_trade_matches(p_album uuid default null, p_limit int default 3)
returns table (partner_id uuid, partner_name text, give_card_id uuid, get_card_id uuid, options int)
language sql stable security definer set search_path = '' as $$
  with p as (
    select * from app.trade_pairs(app.uid(), p_album) where app.uid() is not null
  ), ranked as (
    select p.partner_id, p.give_card_id, p.get_card_id,
           count(*) over (partition by p.partner_id)::int as options,
           row_number() over (partition by p.partner_id order by p.give_card_id, p.get_card_id) as rn
      from p
  )
  select r.partner_id, coalesce(nullif(btrim(pr.display_name), ''), 'S2U fan'), r.give_card_id, r.get_card_id, r.options
    from ranked r join public.profiles pr on pr.id = r.partner_id
   where r.rn = 1
   order by r.options desc, r.partner_id
   limit greatest(1, least(p_limit, 20))
$$;

-- True when the caller really is in a match with p_partner for exactly these cards (guards "Send trade request").
create or replace function app.can_trade(p_partner uuid, p_give uuid, p_get uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.uid() is not null and exists (
    select 1 from app.trade_pairs(app.uid(), null) p
     where p.partner_id = p_partner and p.give_card_id = p_give and p.get_card_id = p_get)
$$;

revoke all on function app.trade_pairs(uuid, uuid), app.my_trade_matches(uuid, int), app.can_trade(uuid, uuid, uuid) from public;
grant execute on function app.my_trade_matches(uuid, int), app.can_trade(uuid, uuid, uuid) to fan_app;
