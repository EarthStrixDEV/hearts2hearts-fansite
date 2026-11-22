-- media.path is normally an object key in the private `assets` bucket ("media/<uuid>.<ext>").
-- It may now also hold an image URL on X's CDN (pbs.twimg.com) that is hotlinked instead of uploaded.
-- Allow only those two shapes: any other http(s) URL is rejected at the database, not just in the UI.
alter table public.media
  add constraint media_path_shape check (
    path !~* '^[a-z][a-z0-9+.-]*:'
    or path ~ '^https://pbs\.twimg\.com/(media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)/[A-Za-z0-9_./-]+(\?[A-Za-z0-9_=&.-]*)?$'
  );
