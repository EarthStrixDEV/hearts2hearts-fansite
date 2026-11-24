-- Photocard collection on member pages: one photo per member per release (era).
-- media_id is nullable on purpose: a deleted photo makes the card fall back to its gradient instead of removing the row.
create table public.member_era_cards (
  member_id uuid not null references public.members on delete cascade,
  album_id uuid not null references public.albums on delete cascade,
  media_id uuid references public.media on delete set null,
  primary key (member_id, album_id)
);
