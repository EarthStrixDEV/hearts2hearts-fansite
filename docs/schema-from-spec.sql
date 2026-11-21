create type content_status as enum ('draft','published','archived');
create type user_role as enum ('admin','editor','fan');

-- Auth & Users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  role user_role not null default 'fan',
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Media Library
create table media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,          -- path ใน bucket media
  mime_type text not null,
  width int, height int,
  alt text,
  credit text,                         -- ที่มารูป
  uploaded_by uuid references profiles,
  created_at timestamptz not null default now()
);

-- Members
create table members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  stage_name text not null,
  name_ko text,
  real_name text,
  birth_date date,
  position text[],                     -- {Vocal, Dance, ...}
  color_hex text not null default '#F9A8D4',
  bio text,
  avatar_id uuid references media,
  cover_id uuid references media,
  gallery_ids uuid[] default '{}',
  sort_order int not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles
);

create table member_facts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  label text not null,                 -- เช่น ส่วนสูง, MBTI
  value text not null,
  sort_order int not null default 0
);

-- Music
create table albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  album_type text not null check (album_type in ('single','ep','album')),
  release_date date,
  cover_id uuid references media,
  description text,
  spotify_url text,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles
);

create table tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums on delete cascade,
  track_no int not null,
  title text not null,
  duration_sec int,
  is_title_track boolean not null default false,
  spotify_url text,
  youtube_url text,
  unique (album_id, track_no)
);

create table track_members (
  track_id uuid references tracks on delete cascade,
  member_id uuid references members on delete cascade,
  primary key (track_id, member_id)
);

-- Blog
create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_md text not null default '',
  cover_id uuid references media,
  member_id uuid references members,
  source text not null default 'human' check (source in ('human','ai')),
  status content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table post_tags (
  post_id uuid references posts on delete cascade,
  tag_id uuid references tags on delete cascade,
  primary key (post_id, tag_id)
);

create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,       -- กันรันซ้ำวันเดียวกัน
  topic text,
  prompt text not null,
  model text not null,
  post_id uuid references posts on delete set null,
  state text not null default 'pending'
    check (state in ('pending','drafted','approved','rejected','failed')),
  error text,
  created_at timestamptz not null default now()
);

-- Schedule
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null check (event_type in ('concert','fanmeet','broadcast','release','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  city text,
  country text,
  ticket_url text,
  poster_id uuid references media,
  is_cancelled boolean not null default false,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles
);

-- Game
create table game_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                  -- question, card, sticker ...
  payload jsonb not null,              -- โครงตามชนิดเกม
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table game_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  season text not null default 'S1',
  score int not null check (score >= 0),
  played_at timestamptz not null default now()
);
create index on game_scores (season, score desc);

-- Mini City
create table city_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  pos_x real not null, pos_y real not null, pos_z real not null,
  model_id uuid references media,      -- .glb
  link_type text check (link_type in ('member','event','post','url')),
  link_id uuid,
  link_url text,
  status content_status not null default 'draft'
);

-- Pages & Home
create table hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references media,
  headline text,
  subline text,
  cta_label text,
  cta_url text,
  show_from timestamptz,
  show_until timestamptz,
  sort_order int not null default 0,
  status content_status not null default 'draft'
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,           -- about, privacy ...
  title text not null,
  body_md text not null default '',
  status content_status not null default 'draft',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles
);

create table site_settings (
  key text primary key,                -- site_name, social_links, nav, footer, ai_prompt
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Audit
create table activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles,
  action text not null,                -- create, update, publish, delete
  entity text not null,                -- ชื่อตาราง
  entity_id text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);