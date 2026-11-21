<div align="center">

# 💗 H2H·S2U

**An unofficial, fan-made home for Hearts2Hearts and S2U.**
Members, music, blog, schedule, a mini game and a tiny 3D city, all driven by a CMS.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-Postgres%20%C2%B7%20Auth%20%C2%B7%20Storage-00E599?logo=postgresql&logoColor=black)

</div>

> Fan project. Not affiliated with SM Entertainment or the artists. All images and music rights belong to their owners.

## Highlights

- **Public site** with a pastel holographic look (light and dark): Home, Members, Member detail, Music, Blog, Schedule, Game, Mini City, About, plus a UI kit page at `/kit`.
- **CMS at `/admin`**: members, releases, AI blog, schedule, media library and site settings, with Save draft / Publish and instant revalidation of the public pages.
- **Everything comes from the database.** Content is never hardcoded. With no database configured the public pages fall back to the design's seed data, so the site still runs.
- **Mini game** with login, a server-checked score (per-round cap, throttle) and a season leaderboard.
- **AI daily blog draft**: a Vercel Cron calls an LLM once a day and writes a *draft*. A human always approves before anything is published.
- **Accessible by default**: real buttons and links, a visible focus ring, reduced-motion support, usable down to 390px.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber |
| Database | [Neon](https://neon.com) Postgres via `pg` (pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED` for migrations) |
| Auth | Neon Auth (Managed Better Auth). Identity lives in `neon_auth."user"`, the app role (`admin` / `editor` / `fan`) in `public.profiles` |
| Files | Neon Object Storage (S3 compatible), private bucket `assets`, served through signed URLs |
| Rendering | ISR with cache tags, `revalidateTag` on publish |
| Hosting | Vercel (cron for the AI blog in `vercel.json`) |

## Routes

| Public | Admin (editor+) |
| --- | --- |
| `/` `/members` `/members/[slug]` | `/admin` dashboard |
| `/music` `/schedule` `/about` | `/admin/members` `/admin/music` |
| `/blog` `/blog/[slug]` | `/admin/posts` `/admin/events` |
| `/game` `/city` `/kit` | `/admin/media` · `/admin/settings` (admin only) |
| `/auth/sign-in` `/auth/sign-up` | API: `/api/game/score` `/api/revalidate` `/api/cron/ai-blog` |

## Getting started

```bash
npm install
cp .env.example .env.local        # or let `neon deploy` fill it in
npm run db:migrate                # applies db/migrations/*.sql (idempotent)
npm run dev                       # http://localhost:3000
```

### Environment

`neon deploy` writes the Neon variables into `.env.local`. The rest is app config.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` · `DATABASE_URL_UNPOOLED` | Neon Postgres (pooled for the app, direct for migrations) |
| `NEON_AUTH_BASE_URL` · `NEON_AUTH_JWKS_URL` | Neon Auth |
| `NEON_AUTH_COOKIE_SECRET` | Session cookie secret, 32+ chars (`openssl rand -base64 32`) |
| `AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` · `AWS_ENDPOINT_URL_S3` · `AWS_REGION` | Neon Object Storage |
| `CRON_SECRET` | Protects `/api/cron/ai-blog` |
| `LLM_API_KEY` · `LLM_MODEL` | AI blog draft (Anthropic key; model optional) |

### Create the first admin

New accounts start as `fan`. Sign up at `/auth/sign-up`, then promote yourself once:

```sql
update public.profiles set role = 'admin'
where id = (select id from neon_auth."user" where email = 'you@example.com');
```

Sign in at `/auth/sign-in` and open `/admin`.

## Project layout

```
src/
  app/(public)/      public pages (Navbar + Footer from the shared layout)
  app/admin/         CMS (guarded by src/proxy.ts and requireRole)
  app/auth/          sign-in / sign-up / sign-out
  app/api/           auth, game score, revalidate, AI cron
  components/        ui/ (Button, Chip, ...), shell/, and one folder per page group
  lib/neon/          db (pg pool, withTx, withActor) and storage
  lib/auth/          Neon Auth server/client and getCurrentUser / requireRole
  lib/db/            one data module per area, with seed fallback in lib/db/seed/
db/migrations/       ordered SQL, tracked in schema_migrations
scripts/migrate.mjs  migration runner
design/              the original design boards (reference only)
docs/                spec, backend notes, game payload shapes
```

## How it is put together

- **Authorization lives in the app, not in RLS.** Every write path calls `requireRole("editor" | "admin")`, and public reads filter `status = 'published'` in SQL (posts also `published_at <= now()`). `/admin/*` is additionally guarded by `src/proxy.ts`.
- **Auditing.** Admin writes run inside `withActor(userId, …)`, so triggers stamp `updated_by` and `activity_log.actor_id`. Deleting a user keeps their content and audit rows (the actor becomes `NULL`).
- **Cache.** Public pages are ISR with tags (`home`, `members`, `member:{slug}`, `music`, `posts`, `events`, `game`, `city`, `pages`, `settings`); publishing in the CMS revalidates the matching tags.
- **Design source.** `design/project/*.dc.html` are the boards the UI was built from; tokens and shared classes live in `src/app/globals.css`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` · `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply pending SQL migrations to Neon |

## Status and known gaps

- Verified end to end on Neon: sign-up / sign-in, role gating, Members and Schedule forms, Settings, media upload (valid, fake and anonymous cases), game score API, and public pages updating after publish.
- Not covered yet: the Releases and AI Blog admin forms, the delete buttons, and a live run of the AI cron.
- CMS screens without a design board (Tracks, AI Queue, Game, City, Home Builder, Pages, Users, Activity Log) are not built yet.
- Member photos and cover images are not wired to the media library yet; the UI uses the design's gradient placeholders.
- A fresh database is empty, so the site shows the design's empty states until content is added in the CMS.
