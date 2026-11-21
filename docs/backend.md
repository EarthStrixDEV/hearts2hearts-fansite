# Backend (Neon Postgres + AI cron)

Postgres on **Neon** (`pg`), identity from Neon Auth (`neon_auth."user"`), files in Object Storage bucket `assets`. Supabase is not used. App code reads/writes through `query()` / `queryOne()` / `withTx()` from `@/lib/neon/db`.

Status: migrations 0001–0003 **applied** to the project's Neon database (verified: 19 app tables + `schema_migrations`, 6 seeded `site_settings` keys).

## Migrations (`db/migrations/`, filename order)

| File | Contents |
|---|---|
| `0001_schema.sql` | enums, 19 tables (spec DDL, columns unchanged), indexes. `profiles.id` → `neon_auth."user"(id) on delete cascade` |
| `0002_triggers.sql` | `current_app_user()`, `set_updated_at()` (members/albums/posts/events/pages/site_settings), `log_activity()` (members/albums/posts/events/city_spots/hero_slides/pages/site_settings), `posts_default_published_at()` |
| `0003_seed_site_settings.sql` | `site_name, tagline, social_links, nav, footer, ai_prompt` (`on conflict do nothing`) |

Never edit an applied file; add `0004_….sql`. Migrations are additive and never touch `neon_auth`.

### Apply

```powershell
node --env-file=.env.local scripts/migrate.mjs
```

Uses `DATABASE_URL_UNPOOLED`, one transaction per file, records each in `public.schema_migrations`, skips applied files, takes an advisory lock. (`npm run db:migrate` once `package.json` gets the script; requested in `docs/shared-requests.md`.)

## Authorization (no RLS)

The database enforces nothing about roles. Every write route/action must call `requireRole("editor" | "admin")` (`src/lib/auth/session.ts`), and every public read must filter in SQL: `status = 'published'`, posts also `published_at <= now()`, child tables via a join/exists on the published parent, `game_items.is_active`, `site_settings` excluding key `ai_prompt`. `profiles` holds role/ban; rows are created lazily by `getCurrentUser()`; `game_scores` rows are inserted by a server route after auth, never from the client.

Audit actor: inside `withTx`, first `select set_config('app.user_id', $1, true)`. Then `set_updated_at` stamps `updated_by` and `log_activity` fills `activity_log.actor_id`. Without it both stay null (cron, scripts).

## Role bootstrap

Sign up once in the app (creates `neon_auth."user"`, then the `profiles` row on first request), then promote yourself:

```sql
update public.profiles set role = 'admin'
where id = (select id from neon_auth."user" where email = 'you@example.com');
```

## Environment variables

| Var | Notes |
|---|---|
| `DATABASE_URL` | pooled, app traffic |
| `DATABASE_URL_UNPOOLED` | direct, migrations only |
| `NEON_AUTH_*`, `AWS_*`, `NEON_*` | provisioned by Neon (auth + storage) |
| `CRON_SECRET` | any long random string. Vercel sends it as `Authorization: Bearer …` to cron routes. Route returns 500 if unset (never open) |
| `LLM_API_KEY` | Anthropic API key |
| `LLM_MODEL` | optional, default `claude-sonnet-5-5` |

Set the same values in Vercel → Project Settings → Environment Variables for deploys.

## AI daily blog

`GET /api/cron/ai-blog` — `vercel.json` cron `0 2 * * *` (UTC) = 09:00 Asia/Bangkok (no DST).

1. `Authorization: Bearer $CRON_SECRET` check (401 otherwise).
2. `insert into ai_jobs … on conflict (run_date) do nothing` with today's date (Bangkok). No row inserted → `{status:"skipped"}` (200).
3. Context: next published non-cancelled event, latest published album + its title track, `site_settings.ai_prompt` (falls back to `DEFAULT_AI_PROMPT` in `src/lib/ai/blog.ts`).
4. LLM call (`src/lib/ai/llm.ts`, `fetch` to the Anthropic Messages API) → JSON `{title, excerpt, body_md}` → in one transaction: insert `posts` (`source='ai'`, `status='draft'`, `published_at` null) and set `ai_jobs.state='drafted'`, `post_id`, `topic` (= title), `prompt` (final prompt).
5. Any error → `ai_jobs.state='failed'` + `error`, response 500. **Never publishes.**

Approve (AI Queue, editor): set `posts.status='published'` (trigger fills `published_at`) and `ai_jobs.state='approved'`, then revalidate posts — under `requireRole("editor")`.

Retry after a failed run the same day: `delete from ai_jobs where run_date = current_date` (Bangkok date), then call the route again; the unique `run_date` otherwise blocks it.

Manual test (local, env loaded):

```powershell
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/ai-blog
```

The route sets `maxDuration = 60`. Vercel Hobby allows one daily cron.
