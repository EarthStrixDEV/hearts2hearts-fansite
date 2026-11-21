# Shared change requests

Append: `- [session] file/dep — what + why`
- [backend] .env.example — add optional `LLM_MODEL=` (default claude-sonnet-5-5 in src/lib/ai/llm.ts); LLM_API_KEY is an Anthropic key.
- [backend] FYI all sessions — `profiles` table is readable only by self/editor (spec: anon sees display_name only). For public name/avatar (leaderboard, bylines) read view `public_profiles` (id, display_name, avatar_url), not `profiles`. game_scores insert = service role only.
- [backend] FYI admin-cms — ai_jobs writes are admin-only per spec §6; the AI Queue Approve/Reject (update ai_jobs.state + publish post) must use the service client after an is_editor() check, or run as admin. Editors can write site_settings except key `ai_prompt`.
- [admin-cms] /login page — middleware redirects unauthenticated /admin/* to `/login?next=<path>`; needs a sign-in page (Supabase auth) that honours `next`. Who owns it?
- [admin-cms] Supabase Storage bucket `media` (public read, editor+ insert/delete policies) — Media Library uploads from the browser to this bucket; public URL = `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/<path>`.
- [admin-cms] RLS: editors need UPDATE on `ai_jobs` (or admin-only AI Queue) so Approve/Reject can sync ai_jobs.state; currently the posts board only changes posts.status.
- [admin-cms] src/lib/db/seed/* — admin renders empty states when Supabase env is missing; it does not read seed data (it must show drafts, which seed data has none of).
- [music/blog/schedule] src/lib/supabase/* — add a cookie-less anon client (e.g. createAnonClient()); unstable_cache cannot call cookies(), so music.ts/posts.ts/events.ts each inline createClient(url, anonKey, {auth:{persistSession:false}} for public reads.
- [music/blog/schedule] src/components/shell/Footer.tsx — /music shows a fixed mobile player dock (bottom 12px, 64px tall) that covers the footer's last row on <=1000px; add ~96px bottom padding when the music page is mounted (or accept).
- [music/blog/schedule] globals.css — `.seg` pill-toggle is defined 3x in my CSS modules (music/blog/schedule); promote to a shared class if other pages need it.
- [blog] media — posts.cover_id / events.poster_id / albums.cover_id are not resolved to URLs (no media-URL helper); gradient placeholders used. Needs a shared getMediaUrl(path) once Storage bucket is decided.
- [backend] package.json — add script `"db:migrate": "node --env-file=.env.local scripts/migrate.mjs"` (applies db/migrations/*.sql via DATABASE_URL_UNPOOLED; idempotent, tracked in schema_migrations).
- [backend] FYI — writes that should record an actor: inside withTx first run `select set_config('app.user_id', $1, true)` (transaction-local). set_updated_at then stamps updated_by and log_activity fills activity_log.actor_id. Without it both stay null.
- [backend] FYI — ai_jobs/posts: AI Queue Approve = update ai_jobs.state='approved' + posts.status='published' (published_at auto-filled by trigger). All write paths need requireRole('editor'|'admin') in app code (no RLS).
- [home/members/about] media — members.avatar_id/cover_id/gallery_ids are not resolved (gradient placeholders); only hero_slides.image_id is, via signedUrl(key, 24h) in src/lib/db/home.ts. A shared member-photo helper would unblock the rest.
- [home/members/about] CMS contract — member data beyond `members` columns lives in member_facts labels: "Nationality", "Fun fact" (repeatable), "Pre-debut", "Card rarity" (holo|rare|common), "Height", "MBTI" (constants: FACT in src/lib/db/seed/members.ts). hero_slides.headline = era name, subline = "kind · date". Admin Members form should write these labels.
- [home/members/about] revalidate tags used: home, members, member:{slug}, pages (+ music, posts, events on the home section cache).
- [game-city-kit] /auth/sign-in — LoginGate links to `/auth/sign-in?next=/game`; please make the sign-in page return to `next` (same-origin paths only) after login. Sign-out uses `authClient.signOut()` from `src/lib/auth/client.ts`.
- [game-city-kit] db/migrations — needs tables `game_items`, `game_scores` (index on season, score desc), `city_spots` exactly as docs/schema-from-spec.sql; `profiles.id` must be the FK target of `game_scores.user_id`.
- [game-city-kit] admin CMS (/admin/game, /admin/city) — after saving call `revalidateTag('game', 'max')` / `revalidateTag('city', 'max')` (GAME_TAG / CITY_TAG exported from src/lib/db/{game,city}.ts). Payload shapes: docs/game-payload.md.
