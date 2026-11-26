# Fan club (S2U) — running and deploying it

## Database

Apply in order with `npm run db:migrate` (reads `DATABASE_URL_UNPOOLED`): `0010_fan.sql`, `0012_trade_matching.sql`, `0014_capsule_fandom_count.sql`. Then `npm run db:seed-fan` (idempotent). **Always try them on a Neon branch first**; this repo's `.env.local` points at production.

`0010` refuses to run unless the role `fan_app` exists and does not bypass RLS. Create it with SQL, never in the Neon console (console roles join `neon_superuser`, which bypasses RLS):

```sql
create role fan_app login password '<secret>';
```

Put the pooled connection string of that role in `DATABASE_URL_APP` (Vercel + `.env.local`). Without it the `/fan` pages fall back to seed data and the login-required pages cannot load data.

Neon Auth users live in `neon_auth."user"`; `profiles.id` references it. A branch only has the users that existed when it was created, so a newer account cannot sign in against a branch (foreign key error) until its row is copied over.

## Crons (`vercel.json`)

| Route | Schedule (UTC) | What it does |
| --- | --- | --- |
| `/api/cron/match-trades` | `*/15 * * * *` | records new photocard matches (`trade_match_notices`) |
| `/api/cron/unlock-capsules` | `0 * * * *` | finds letters opened in the last hour; at 00:00 UTC also purges old `live_presence` |
| `/api/cron/build-wrapped` | `0 0 1 12 *` | builds every fan's Wrapped snapshot and slide images (rerun with `?year=` to resume) |

All reject calls without `Authorization: Bearer $CRON_SECRET`. Sub-daily crons need a Vercel plan that allows them (Hobby only allows daily), and `build-wrapped` asks for a 300 s function limit.

**No notification channel exists in this repo.** Trade matches, unlocked capsules and event reminders are recorded but nothing is sent; the routes report `notified: 0`.

## Tests

- `npm test` runs vitest. The RLS and data suites are **skipped** unless `FAN_TEST_OWNER_URL` and `FAN_TEST_APP_URL` point at a Neon branch with the migrations applied (never production). They create tagged fixtures and remove them.
- `npm run e2e` runs the Playwright smoke tests in Chrome (desktop and 390 px) against a dev server: `E2E_BASE_URL` (default `http://localhost:3130`). `next dev` does not accept `--env-file`, so load the branch env into the shell first. Set `FAN_TEST_OWNER_URL` too for the waiting-room test.
- Signed-in flows are not in the e2e suite (no way to sign in without real credentials); their data paths are covered by the vitest suites.

## Known gaps

- The shelf on `/fan` shows every published album, including remixes and language versions.
- Wrapped has no stream-minutes or top-track cards (no data source).
- The daily login is logged when a fan opens a login-required fan page that loads their profile (hub, capsule, room).
