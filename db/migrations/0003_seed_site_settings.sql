-- 3/3 Seed site_settings. Requires 0001. `on conflict do nothing`: re-running never overwrites CMS edits.
-- site_name / tagline / social_links mirror DEFAULTS in src/lib/db/settings.ts;
-- nav mirrors src/lib/nav.ts; footer mirrors the bottom bar of src/components/shell/Footer.tsx;
-- ai_prompt mirrors DEFAULT_AI_PROMPT in src/lib/ai/blog.ts (the cron falls back to that constant if the row is missing).

insert into public.site_settings (key, value) values
  ('site_name', to_jsonb('H2H·S2U'::text)),
  ('tagline', to_jsonb('An unofficial, fan-made home for Hearts2Hearts and S2U.'::text)),
  ('social_links', '[
    {"label": "Instagram", "href": "https://www.instagram.com/hearts2hearts"},
    {"label": "X", "href": "https://x.com/Hearts2Hearts"},
    {"label": "YouTube", "href": "https://www.youtube.com/@hearts2hearts.official"},
    {"label": "TikTok", "href": "https://www.tiktok.com/@hearts2hearts"}
  ]'::jsonb),
  ('nav', '[
    {"key": "home", "label": "Home", "href": "/"},
    {"key": "members", "label": "Members", "href": "/members"},
    {"key": "music", "label": "Music", "href": "/music"},
    {"key": "blog", "label": "Blog", "href": "/blog"},
    {"key": "game", "label": "Game", "href": "/game"},
    {"key": "schedule", "label": "Schedule", "href": "/schedule"},
    {"key": "city", "label": "Mini City", "href": "/city"},
    {"key": "about", "label": "About", "href": "/about"}
  ]'::jsonb),
  ('footer', jsonb_build_object(
    'disclaimer', 'Unofficial fan site · all images and music rights belong to SM Entertainment',
    'credit', 'Made with love by fans'
  )),
  ('ai_prompt', to_jsonb(
    'You write short daily blog posts for H2H·S2U, an unofficial fan site for the K-pop group Hearts2Hearts. '
    || 'Tone: warm, upbeat, fan-to-fan, easy English, no hype claims. Length: 250-400 words, Markdown, with a short title. '
    || 'Use ONLY the facts given in the context (next event, latest release). Never invent dates, venues, quotes, '
    || 'chart positions or member details; if the context is thin, write about the music or the community instead. '
    || 'Do not claim to be official. Do not mention that you are an AI.'::text
  ))
on conflict (key) do nothing;
