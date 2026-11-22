-- Release art from YouTube Music is read through the album's art-track video thumbnail (found via oEmbed on the
-- music.youtube.com playlist): https://i.ytimg.com/vi/<video id>/maxresdefault.jpg. Allow that host/path in media.path
-- (replaces the s_p playlist-image pattern from 0006, which needs signed query strings and is not usable).
alter table public.media drop constraint if exists media_path_shape;
alter table public.media
  add constraint media_path_shape check (
    path !~* '^[a-z][a-z0-9+.-]*:'
    or path ~ '^https://pbs\.twimg\.com/(media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)/[A-Za-z0-9_./-]+(\?[A-Za-z0-9_=&.-]*)?$'
    or path ~ '^https://i\.ytimg\.com/vi/[A-Za-z0-9_-]{11}/(maxresdefault|hqdefault)\.jpg$'
  );
