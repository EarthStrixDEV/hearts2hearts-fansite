-- Deleting a user (profiles row, cascaded from neon_auth."user") used to fail with a FK violation as soon as that
-- user had touched any content or audit row. These columns only record "who did it": keep the row, null the actor.
-- (game_scores.user_id stays ON DELETE CASCADE: a fan's scores go with the fan.)

alter table public.media        drop constraint if exists media_uploaded_by_fkey,
  add constraint media_uploaded_by_fkey        foreign key (uploaded_by) references public.profiles (id) on delete set null;

alter table public.members      drop constraint if exists members_updated_by_fkey,
  add constraint members_updated_by_fkey       foreign key (updated_by)  references public.profiles (id) on delete set null;

alter table public.albums       drop constraint if exists albums_updated_by_fkey,
  add constraint albums_updated_by_fkey        foreign key (updated_by)  references public.profiles (id) on delete set null;

alter table public.posts        drop constraint if exists posts_updated_by_fkey,
  add constraint posts_updated_by_fkey         foreign key (updated_by)  references public.profiles (id) on delete set null;

alter table public.events       drop constraint if exists events_updated_by_fkey,
  add constraint events_updated_by_fkey        foreign key (updated_by)  references public.profiles (id) on delete set null;

alter table public.pages        drop constraint if exists pages_updated_by_fkey,
  add constraint pages_updated_by_fkey         foreign key (updated_by)  references public.profiles (id) on delete set null;

alter table public.activity_log drop constraint if exists activity_log_actor_id_fkey,
  add constraint activity_log_actor_id_fkey    foreign key (actor_id)    references public.profiles (id) on delete set null;
