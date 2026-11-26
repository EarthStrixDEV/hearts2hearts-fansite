-- 14 Time capsule: "Fandom capsule [COUNT]" card. Requires 0010.
-- capsule_letters is own-rows-only under RLS (and sealed until open_at), so a fan cannot count other fans' letters.
-- This definer function returns ONE number and nothing else: letters to the group whose author opted in to the fan book.
create or replace function app.fandom_capsule_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.capsule_letters where to_kind = 'group' and fanbook_opt_in
$$;

revoke all on function app.fandom_capsule_count() from public;
grant execute on function app.fandom_capsule_count() to fan_app;
