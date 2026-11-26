-- 10 Fan club (S2U): tables, grants, RLS, functions, triggers. Requires 0001-0009.
-- Request-scoped fan code runs as the non-owner role `fan_app` (DATABASE_URL_APP) inside withUser(), which sets
-- app.user_id per transaction; policies read it through app.uid(). Crons, migrations and the seed use the owner (bypasses RLS).
--
-- fan_app MUST be created with SQL, not in the Neon console: console-created roles join neon_superuser, which has BYPASSRLS
-- and would silently turn every policy below into a no-op.
--   create role fan_app login password '<secret>';
-- This migration refuses to run when the role is missing or bypasses RLS.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'fan_app') then
    raise exception 'role fan_app does not exist: run  create role fan_app login password ''...''  first';
  end if;
  if exists (select 1 from pg_roles where rolname = 'fan_app' and (rolbypassrls or rolsuper)) then
    raise exception 'role fan_app has BYPASSRLS/superuser (created in the console?): drop it and recreate it with SQL';
  end if;
end $$;

-- Helpers ---------------------------------------------------------------------
create schema if not exists app;

create or replace function app.uid() returns uuid
language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

-- The repo checks roles in app code only, so there is no SQL role helper to reuse.
create or replace function app.is_editor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = app.uid() and role in ('admin', 'editor'))
$$;

-- Era theme colors (seeded by scripts/seed-fan.mjs)
alter table public.albums add column if not exists theme_from text, add column if not exists theme_to text;

-- Tables ----------------------------------------------------------------------
create table public.fan_profiles (
  user_id uuid primary key references public.profiles on delete cascade,
  nickname text not null,
  bias_member_id uuid references public.members on delete set null,
  theme_mode text not null default 'era' check (theme_mode in ('bias', 'era')),
  era_album_id uuid references public.albums on delete set null,
  joined_fandom_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('comeback', 'anniversary', 'release')),
  target_at timestamptz not null,
  album_id uuid references public.albums,
  teasers jsonb not null default '[]',   -- [{label, unlock_at, media_id}]
  status public.content_status not null default 'draft',
  updated_at timestamptz not null default now()
);

create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  countdown_id uuid not null unique references public.countdowns on delete cascade,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  slow_mode_sec int not null default 5,
  cheers bigint not null default 0
);

create table public.live_presence (
  room_id uuid not null references public.live_rooms on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  anon_id text,
  seen_at timestamptz not null default now(),
  check ((user_id is not null) <> (anon_id is not null))
);
create unique index live_presence_user on public.live_presence (room_id, user_id) where user_id is not null;
create unique index live_presence_anon on public.live_presence (room_id, anon_id) where anon_id is not null;
create index live_presence_seen_idx on public.live_presence (room_id, seen_at);

create table public.live_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.live_rooms on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index live_messages_room_idx on public.live_messages (room_id, id);

create table public.notice_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  image_id uuid not null references public.media,
  state text not null default 'queued' check (state in ('queued', 'reading', 'done', 'failed')),
  model text,
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index notice_jobs_user_idx on public.notice_jobs (user_id, created_at);

create table public.event_reminders (
  user_id uuid not null references public.profiles on delete cascade,
  job_id uuid not null references public.notice_jobs on delete cascade,
  item_index int not null,
  remind_at timestamptz not null,
  kind text not null check (kind in ('1h', '15m', 'vote')),
  sent_at timestamptz,
  primary key (user_id, job_id, item_index, kind)
);

create table public.photocards (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  version text not null,
  image_id uuid references public.media,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  unique (album_id, member_id, version)
);

create table public.fan_cards (
  user_id uuid references public.profiles on delete cascade,
  photocard_id uuid references public.photocards on delete cascade,
  state text not null check (state in ('have', 'want')),
  updated_at timestamptz not null default now(),
  primary key (user_id, photocard_id)
);
create index fan_cards_card_idx on public.fan_cards (photocard_id, state);

create table public.trade_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  give_card_id uuid not null references public.photocards,
  get_card_id uuid not null references public.photocards,
  state text not null default 'pending' check (state in ('pending', 'accepted', 'shipped', 'done', 'cancelled')),
  tracking_no text,
  shipped_by uuid references public.profiles,   -- set by trade_state_guard: "done" must come from the other party
  rating_from smallint check (rating_from between 1 and 5),
  rating_to smallint check (rating_to between 1 and 5),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index trade_requests_from_idx on public.trade_requests (from_user);
create index trade_requests_to_idx on public.trade_requests (to_user);

create table public.trade_match_notices (
  user_id uuid not null references public.profiles on delete cascade,
  partner_id uuid not null references public.profiles on delete cascade,
  give_card_id uuid not null references public.photocards on delete cascade,
  get_card_id uuid not null references public.photocards on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, partner_id, give_card_id, get_card_id)
);

create table public.capsule_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  to_kind text not null check (to_kind in ('group', 'self')),
  paper text not null default 'sky' check (paper in ('sky', 'blush', 'lilac', 'lemon')),
  body text not null check (char_length(body) between 1 and 1000),
  open_at timestamptz not null,
  fanbook_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
create index capsule_letters_user_idx on public.capsule_letters (user_id);
create index capsule_letters_open_idx on public.capsule_letters (open_at);

create table public.fan_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('stream_log', 'mission', 'card', 'live_attend', 'login')),
  ref_id uuid,
  amount int not null default 1 check (amount between 1 and 600),
  created_at timestamptz not null default now()
);
create index fan_activity_user_idx on public.fan_activity (user_id, created_at);

create table public.wrapped_snapshots (
  user_id uuid references public.profiles on delete cascade,
  year int not null,
  data jsonb not null,
  image_id uuid references public.media,
  created_at timestamptz not null default now(),
  primary key (user_id, year)
);

create table public.room_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  unlock_rule jsonb not null,            -- {"kind":"live_attend","count":1}; count = sum of fan_activity.amount for that kind
  model_id uuid references public.media,
  status public.content_status not null default 'draft',
  -- log_fan_activity() casts count to int for every user: a bad rule would break every activity write, so reject it here
  check (unlock_rule ->> 'kind' in ('stream_log', 'mission', 'card', 'live_attend', 'login')
         and (unlock_rule ->> 'count') ~ '^[1-9][0-9]{0,8}$')
);

create table public.fan_room_items (
  user_id uuid references public.profiles on delete cascade,
  item_id uuid references public.room_items on delete cascade,
  unlocked_at timestamptz not null default now(),
  placed boolean not null default false,
  placement jsonb,                       -- {x, y, z, rot}
  primary key (user_id, item_id)
);

-- Functions -------------------------------------------------------------------
-- Daily limits use Thai time (the fan base the UI is written for).

-- Counts online fans in a room. live_presence is own-rows-only under RLS, so the count needs definer rights.
create or replace function app.online_count(p_room uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.live_presence where room_id = p_room and seen_at > now() - interval '45 seconds'
$$;

-- The only write path into fan_activity / fan_room_items. Idempotent for login, live_attend and card.
create or replace function app.log_fan_activity(p_kind text, p_ref uuid default null, p_amount int default 1)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app.uid();
  v_day timestamptz := date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok';
  v_sum int;
begin
  if v_uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and not is_banned) then
    raise exception 'account not allowed' using errcode = '42501';
  end if;
  -- serialise this user's writes of this kind so the cap / once-per-day checks cannot race
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_kind, 0));

  if p_kind = 'stream_log' then
    select coalesce(sum(amount), 0) into v_sum
      from public.fan_activity where user_id = v_uid and kind = 'stream_log' and created_at >= v_day;
    if v_sum + p_amount > 600 then
      raise exception 'stream_log is capped at 600 minutes per day' using errcode = 'H2H02';
    end if;
  elsif p_kind in ('live_attend', 'login') then
    if exists (select 1 from public.fan_activity
                where user_id = v_uid and kind = p_kind and ref_id is not distinct from p_ref and created_at >= v_day) then
      return;
    end if;
  elsif p_kind = 'card' then
    -- toggling have/want must not farm the counter: one row per card, ever
    if exists (select 1 from public.fan_activity where user_id = v_uid and kind = 'card' and ref_id is not distinct from p_ref) then
      return;
    end if;
  end if;

  insert into public.fan_activity (user_id, kind, ref_id, amount) values (v_uid, p_kind, p_ref, p_amount);

  insert into public.fan_room_items (user_id, item_id)
  select v_uid, ri.id
    from public.room_items ri
   where ri.status = 'published'
     and not exists (select 1 from public.fan_room_items f where f.user_id = v_uid and f.item_id = ri.id)
     and (select coalesce(sum(a.amount), 0) from public.fan_activity a
           where a.user_id = v_uid and a.kind = ri.unlock_rule ->> 'kind') >= (ri.unlock_rule ->> 'count')::int
  on conflict do nothing;
end;
$$;

-- Letter metadata only. The body is never returned before open_at (the RLS select policy covers the opened ones).
create or replace function app.my_capsules()
returns table (id uuid, to_kind text, paper text, created_at timestamptz, open_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.to_kind, c.paper, c.created_at, c.open_at
    from public.capsule_letters c where c.user_id = app.uid() order by c.created_at desc
$$;

create or replace function app.cheer(p_room uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app.uid();
  v_total bigint;
begin
  if v_uid is null then
    raise exception 'sign in required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and not is_banned) then
    raise exception 'account not allowed' using errcode = '42501';
  end if;
  update public.live_rooms set cheers = cheers + 1
   where id = p_room and now() between opens_at and closes_at
  returning cheers into v_total;
  if v_total is null then
    raise exception 'room is not open' using errcode = 'H2H03';
  end if;
  return v_total;
end;
$$;

-- Slow mode: one message per user per room per slow_mode_sec. Definer so hidden messages still count.
create or replace function app.live_messages_slow_mode() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_slow int;
begin
  select slow_mode_sec into v_slow from public.live_rooms where id = new.room_id;
  perform pg_advisory_xact_lock(hashtextextended(new.room_id::text || ':' || new.user_id::text, 0));
  if exists (select 1 from public.live_messages m
              where m.room_id = new.room_id and m.user_id = new.user_id
                and m.created_at > now() - make_interval(secs => coalesce(v_slow, 0))) then
    raise exception 'slow mode: one message every % s', v_slow using errcode = 'H2H01';
  end if;
  return new;
end;
$$;
create trigger live_messages_slow_mode before insert on public.live_messages
  for each row execute function app.live_messages_slow_mode();

-- Trade lifecycle: pending -> accepted -> shipped -> done, or cancelled before shipping.
create or replace function app.trade_state_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_uid uuid := app.uid();
begin
  if v_uid is null or v_uid not in (old.from_user, old.to_user) then
    raise exception 'not a party of this trade' using errcode = '42501';
  end if;

  if new.state is distinct from old.state then
    if old.state = 'pending' and new.state = 'accepted' then
      if v_uid <> old.to_user then raise exception 'only the recipient can accept' using errcode = '42501'; end if;
    elsif old.state = 'accepted' and new.state = 'shipped' then
      if nullif(btrim(new.tracking_no), '') is null then raise exception 'tracking_no is required to ship' using errcode = '23514'; end if;
      new.shipped_by := v_uid;
    elsif old.state = 'shipped' and new.state = 'done' then
      if v_uid = old.shipped_by then raise exception 'the receiver confirms delivery' using errcode = '42501'; end if;
    elsif new.state = 'cancelled' and old.state in ('pending', 'accepted') then
      null;
    else
      raise exception 'illegal trade move % -> %', old.state, new.state using errcode = '23514';
    end if;
  end if;

  if new.tracking_no is distinct from old.tracking_no and not (old.state = 'accepted' and new.state = 'shipped') then
    raise exception 'tracking_no can only be set when shipping' using errcode = '23514';
  end if;

  if new.rating_from is distinct from old.rating_from then
    if old.rating_from is not null or new.state <> 'done' or v_uid <> old.from_user then
      raise exception 'rating_from is set once, by the sender, after done' using errcode = '23514';
    end if;
  end if;
  if new.rating_to is distinct from old.rating_to then
    if old.rating_to is not null or new.state <> 'done' or v_uid <> old.to_user then
      raise exception 'rating_to is set once, by the recipient, after done' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trade_state_guard before update on public.trade_requests
  for each row execute function app.trade_state_guard();

-- Existing audit triggers. set_updated_at needs an updated_at column, so only countdowns gets it.
create trigger set_updated_at before insert or update on public.countdowns
  for each row execute function public.set_updated_at();
create trigger log_activity after insert or update or delete on public.countdowns
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.photocards
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.room_items
  for each row execute function public.log_activity();

-- Grants ----------------------------------------------------------------------
revoke all on schema app from public;
grant usage on schema public, app to fan_app;

-- definer functions are callable by fan_app only (functions default to EXECUTE for PUBLIC)
revoke all on function app.uid(), app.is_editor(), app.online_count(uuid), app.log_fan_activity(text, uuid, int),
  app.my_capsules(), app.cheer(uuid) from public;
grant execute on function app.uid(), app.is_editor(), app.online_count(uuid), app.log_fan_activity(text, uuid, int),
  app.my_capsules(), app.cheer(uuid) to fan_app;

-- existing tables the fan pages read (no RLS on these: public reads must filter status in SQL, as everywhere else)
grant select on members, albums, media, site_settings to fan_app;
grant select (id, display_name, avatar_url, is_banned) on profiles to fan_app;   -- never role
grant insert on media to fan_app;   -- notice uploads

grant select on countdowns, live_rooms, photocards, room_items to fan_app;
grant select, insert, update on fan_profiles to fan_app;
grant select, insert, update, delete on fan_cards to fan_app;
grant select, insert on live_messages, notice_jobs, capsule_letters to fan_app;
grant update (is_hidden) on live_messages to fan_app;
grant select, insert, update on live_presence to fan_app;
grant select, insert, update, delete on event_reminders to fan_app;
grant select, insert on trade_requests to fan_app;
grant update (state, tracking_no, rating_from, rating_to) on trade_requests to fan_app;
grant select on fan_activity, wrapped_snapshots, fan_room_items to fan_app;
grant update (placed, placement) on fan_room_items to fan_app;
grant usage on all sequences in schema public to fan_app;
-- trade_match_notices: owner (cron) only. fan_activity / fan_room_items inserts: only through app.log_fan_activity().

-- RLS -------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['fan_profiles', 'countdowns', 'live_rooms', 'live_presence', 'live_messages', 'notice_jobs',
    'event_reminders', 'photocards', 'fan_cards', 'trade_requests', 'trade_match_notices', 'capsule_letters',
    'fan_activity', 'wrapped_snapshots', 'room_items', 'fan_room_items']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Published content
create policy read_published on public.countdowns for select using (status = 'published' or app.is_editor());
create policy read_published on public.photocards for select using (status = 'published' or app.is_editor());
create policy read_published on public.room_items for select using (status = 'published' or app.is_editor());
create policy read_all on public.live_rooms for select using (true);

-- Waiting room (guests can hold a presence row keyed by anon_id; they cannot read chat)
create policy presence_rw on public.live_presence for all
  using (user_id = app.uid() or (user_id is null and app.uid() is null))
  with check (user_id = app.uid() or (user_id is null and app.uid() is null));
create policy read_visible on public.live_messages for select
  using (app.uid() is not null and (not is_hidden or app.is_editor()));
create policy insert_own on public.live_messages for insert with check (
  user_id = app.uid()
  and not coalesce((select is_banned from public.profiles where id = app.uid()), false)
  and exists (select 1 from public.live_rooms r where r.id = room_id and now() between r.opens_at and r.closes_at)
);
create policy editor_hide on public.live_messages for update using (app.is_editor()) with check (app.is_editor());

-- Owner-only
create policy own on public.fan_profiles for all using (user_id = app.uid()) with check (user_id = app.uid());
create policy own on public.fan_cards for all using (user_id = app.uid()) with check (user_id = app.uid());
create policy own on public.event_reminders for all using (user_id = app.uid()) with check (user_id = app.uid());
create policy own_read on public.notice_jobs for select using (user_id = app.uid());
create policy own_insert on public.notice_jobs for insert with check (user_id = app.uid());
create policy own_read on public.fan_room_items for select using (user_id = app.uid());
create policy own_update on public.fan_room_items for update using (user_id = app.uid()) with check (user_id = app.uid());
create policy own_read on public.fan_activity for select using (user_id = app.uid());
create policy own_read on public.wrapped_snapshots for select using (user_id = app.uid());

-- Trades
create policy parties_read on public.trade_requests for select using (app.uid() in (from_user, to_user));
create policy sender_insert on public.trade_requests for insert with check (from_user = app.uid() and state = 'pending');
create policy parties_update on public.trade_requests for update
  using (app.uid() in (from_user, to_user)) with check (app.uid() in (from_user, to_user));

-- Capsule: sealed until open_at, never editable (no update grant, no update policy).
-- Inserts must not use RETURNING: the new row is not selectable until open_at.
create policy own_read_after_open on public.capsule_letters for select using (user_id = app.uid() and now() >= open_at);
create policy own_insert on public.capsule_letters for insert with check (user_id = app.uid() and open_at > now());
