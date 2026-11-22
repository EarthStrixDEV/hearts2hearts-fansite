-- YouTube Music: albums link to their YouTube Music playlist, and release art can be hotlinked from YouTube's image host
-- (https://i9.ytimg.com/s_p/<OLAK playlist id>/maxresdefault.jpg) like X images. MV links stay in tracks.youtube_url.
alter table public.albums add column if not exists ytmusic_url text;

alter table public.media drop constraint if exists media_path_shape;
alter table public.media
  add constraint media_path_shape check (
    path !~* '^[a-z][a-z0-9+.-]*:'
    or path ~ '^https://pbs\.twimg\.com/(media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)/[A-Za-z0-9_./-]+(\?[A-Za-z0-9_=&.-]*)?$'
    or path ~ '^https://i[0-9]?\.ytimg\.com/s_p/OLAK[A-Za-z0-9_-]+/(maxresdefault|hqdefault|sddefault)\.jpg$'
  );
