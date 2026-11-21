-- 1/3 Enums, tables, indexes (plain Postgres on Neon).
-- Base: docs/schema-from-spec.sql (19 tables), unchanged columns so src/lib/db/types.ts stays in sync.
-- Table order = FK dependency order: profiles -> media -> members -> ... -> posts -> ai_jobs.

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.user_role as enum ('admin', 'editor', 'fan');

-- Auth & Users ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references neon_auth."user" (id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'fan',
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Media Library --------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,           -- object key in bucket `assets`
  mime_type text not null,
  width int,
  height int,
  alt text,
  credit text,                         -- image source / credit
  uploaded_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

-- Members --------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  stage_name text not null,
  name_ko text,
  real_name text,
  birth_date date,
  position text[],                     -- {Vocal, Dance, ...}
  color_hex text not null default '#F9A8D4',
  bio text,
  avatar_id uuid references public.media,
  cover_id uuid references public.media,
  gallery_ids uuid[] default '{}',
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

create table public.member_facts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members on delete cascade,
  label text not null,                 -- e.g. Height, MBTI
  value text not null,
  sort_order int not null default 0
);

-- Music ----------------------------------------------------------------------
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  album_type text not null check (album_type in ('single', 'ep', 'album')),
  release_date date,
  cover_id uuid references public.media,
  description text,
  spotify_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums on delete cascade,
  track_no int not null,
  title text not null,
  duration_sec int,
  is_title_track boolean not null default false,
  spotify_url text,
  youtube_url text,
  unique (album_id, track_no)
);

create table public.track_members (
  track_id uuid references public.tracks on delete cascade,
  member_id uuid references public.members on delete cascade,
  primary key (track_id, member_id)
);

-- Blog -----------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_md text not null default '',
  cover_id uuid references public.media,
  member_id uuid references public.members,
  source text not null default 'human' check (source in ('human', 'ai')),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.post_tags (
  post_id uuid references public.posts on delete cascade,
  tag_id uuid references public.tags on delete cascade,
  primary key (post_id, tag_id)
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,       -- guards against double runs on the same day
  topic text,
  prompt text not null,
  model text not null,
  post_id uuid references public.posts on delete set null,
  state text not null default 'pending'
    check (state in ('pending', 'drafted', 'approved', 'rejected', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

-- Schedule -------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null check (event_type in ('concert', 'fanmeet', 'broadcast', 'release', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  city text,
  country text,
  ticket_url text,
  poster_id uuid references public.media,
  is_cancelled boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

-- Game -----------------------------------------------------------------------
create table public.game_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                  -- question, card, sticker ...
  payload jsonb not null,              -- shape depends on game kind
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.game_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  season text not null default 'S1',
  score int not null check (score >= 0),
  played_at timestamptz not null default now()
);

-- Mini City ------------------------------------------------------------------
create table public.city_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  pos_x real not null,
  pos_y real not null,
  pos_z real not null,
  model_id uuid references public.media,   -- .glb
  link_type text check (link_type in ('member', 'event', 'post', 'url')),
  link_id uuid,                            -- polymorphic, no FK by design
  link_url text,
  status public.content_status not null default 'draft'
);

-- Pages & Home ---------------------------------------------------------------
create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.media,
  headline text,
  subline text,
  cta_label text,
  cta_url text,
  show_from timestamptz,
  show_until timestamptz,
  sort_order int not null default 0,
  status public.content_status not null default 'draft'
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,           -- about, privacy ...
  title text not null,
  body_md text not null default '',
  status public.content_status not null default 'draft',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

create table public.site_settings (
  key text primary key,                -- site_name, tagline, social_links, nav, footer, ai_prompt
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Audit ----------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles,
  action text not null,                -- create, update, publish, delete
  entity text not null,                -- table name
  entity_id text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);

-- Indexes (FK lookups + public list queries) ---------------------------------
create index game_scores_season_score_idx on public.game_scores (season, score desc);
create index game_scores_user_idx on public.game_scores (user_id);
create index member_facts_member_idx on public.member_facts (member_id, sort_order);
create index tracks_album_idx on public.tracks (album_id);
create index track_members_member_idx on public.track_members (member_id);
create index post_tags_tag_idx on public.post_tags (tag_id);
create index posts_published_idx on public.posts (status, published_at desc);
create index posts_member_idx on public.posts (member_id);
create index events_starts_idx on public.events (status, starts_at);
create index albums_release_idx on public.albums (status, release_date desc);
create index members_sort_idx on public.members (status, sort_order);
create index hero_slides_sort_idx on public.hero_slides (status, sort_order);
create index city_spots_status_idx on public.city_spots (status);
create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_entity_idx on public.activity_log (entity, entity_id);
create index media_uploaded_by_idx on public.media (uploaded_by);
