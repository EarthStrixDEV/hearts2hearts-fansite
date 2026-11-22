-- Official promo images are read from YouTube's image host: video thumbnails (hq720 / maxresdefault) and the vertical
-- Shorts thumbnails (oar2). Same host/path allowlist as the app (src/lib/media-url.ts), enforced here too.
alter table public.media drop constraint if exists media_path_shape;
alter table public.media
  add constraint media_path_shape check (
    path !~* '^[a-z][a-z0-9+.-]*:'
    or path ~ '^https://pbs\.twimg\.com/(media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)/[A-Za-z0-9_./-]+(\?[A-Za-z0-9_=&.-]*)?$'
    or path ~ '^https://i\.ytimg\.com/vi/[A-Za-z0-9_-]{11}/(maxresdefault|hqdefault|hq720|oar2)\.jpg$'
  );
