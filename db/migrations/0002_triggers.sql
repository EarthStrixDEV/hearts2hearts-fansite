-- 2/3 set_updated_at() on every table with updated_at; log_activity() on content tables;
-- posts.published_at default. Requires 0001 (tables).
--
-- Actor = the signed-in app user, passed by the app per transaction:
--   select set_config('app.user_id', '<uuid>', true);   -- inside withTx(); `true` = transaction-local (PgBouncer safe)
-- When unset (cron, scripts, seeds) updated_by stays untouched and activity_log.actor_id is null.

create or replace function public.current_app_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  begin
    v_uid := nullif(current_setting('app.user_id', true), '')::uuid;
  exception when invalid_text_representation then
    return null;
  end;
  -- FKs point at profiles; never let auditing break a write for a user without a profile row
  if v_uid is not null and not exists (select 1 from public.profiles where id = v_uid) then
    return null;
  end if;
  return v_uid;
end;
$$;

-- set_updated_at: stamps updated_at; stamps updated_by too when the table has it and an actor is set.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := public.current_app_user();
begin
  new.updated_at := now();
  if v_uid is not null and to_jsonb(new) ? 'updated_by' then
    new := jsonb_populate_record(new, jsonb_build_object('updated_by', v_uid));
  end if;
  return new;
end;
$$;

-- log_activity: writes activity_log.
-- insert -> 'create' (diff = row); delete -> 'delete' (diff = row);
-- update -> 'publish' when status changed to published, else 'update' (diff = {col:{old,new}}).
-- No-op updates (only updated_at/updated_by changed) are not logged.
create or replace function public.log_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_row jsonb;
  v_diff jsonb;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_action := 'create';
    v_diff := v_row;
  elsif tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_action := 'delete';
    v_diff := v_row;
  else
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);
    v_row := v_new;
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('old', v_old -> n.key, 'new', n.value)), '{}'::jsonb)
      into v_diff
      from jsonb_each(v_new) as n
     where n.key not in ('updated_at', 'updated_by')
       and n.value is distinct from (v_old -> n.key);
    if v_diff = '{}'::jsonb then
      return null;
    end if;
    v_action := case when v_diff #>> '{status,new}' = 'published' then 'publish' else 'update' end;
  end if;

  insert into public.activity_log (actor_id, action, entity, entity_id, diff)
  values (public.current_app_user(), v_action, tg_table_name, coalesce(v_row ->> 'id', v_row ->> 'key'), v_diff);
  return null;
end;
$$;

-- posts: published without published_at would never show on public queries (they filter published_at <= now()).
create or replace function public.posts_default_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

-- updated_at triggers (tables that have the column) --------------------------
create trigger set_updated_at before insert or update on public.members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.albums
  for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.posts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.pages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger posts_default_published_at before insert or update on public.posts
  for each row execute function public.posts_default_published_at();

-- activity_log triggers (content tables + site_settings) ---------------------
create trigger log_activity after insert or update or delete on public.members
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.albums
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.posts
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.events
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.city_spots
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.hero_slides
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.pages
  for each row execute function public.log_activity();
create trigger log_activity after insert or update or delete on public.site_settings
  for each row execute function public.log_activity();
