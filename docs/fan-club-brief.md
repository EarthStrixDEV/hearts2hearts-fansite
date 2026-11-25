# Fan club (S2U) — brief for the phase sessions

Source: Earth's `IMPLEMENT_FAN_CLUB.md` (parts 1 and 2), condensed. Phases 0–2 are done and committed on `feat/fan-club`. You own ONE of phases 3–8 (your kickoff says which). Phase 9 (wire-up, Playwright smoke tests, final PR) is done by the lead session after merging, so do not do it.

Reply to Earth in Thai (sweet younger-sister tone, concise), keep code/comments in English. Persona details are in the user-level CLAUDE.md.

## 0. Scope and hard rules

Hearts2Hearts only. Out of scope, do not build or hook: ILLIT, multi-group/theme switching, new CMS/admin pages, a main-nav link to `/fan`, any screen or form that is not on an artboard.

- **Database: Neon only.** No Supabase package. Spec text that says Supabase is replaced by this file.
- **Content rules (hard):** no official photos/logos without a licence (use `media` uploads with `credit`; gradients as placeholders, never invent images); no AI chat/voice imitating a real member; nothing sold or gacha'd (room items are earned only).
- **Time:** every instant is `timestamptz` (UTC). Show KST (`Asia/Seoul`) and Thai time (`Asia/Bangkok`) with `Intl.DateTimeFormat`; never hardcode offsets. Use `src/lib/fan/time.ts` (`formatZoned`, `KST`, `ICT`, `todayIct`, `splitRemaining`, …).
- **Accessibility:** real `<button>`/`<a>`/`<label>`, focus ring per theme (2px pink, already global), 44px touch targets, `prefers-reduced-motion` turns off spin/pulse/tilt (a global rule already kills animations/transitions; keep it that way).
- **Never run a migration on the production branch.** Production is what `.env.local` points to. Work only on the dev branch (below).
- Validate every input with zod before it reaches SQL. Parameterised SQL only (`$1..`).
- No secrets in client bundles. LLM calls only in API routes.

## 1. Where things are (after phase 2)

| What | Where |
| --- | --- |
| Design (read-only data) | the Claude Design canvas, saved on disk at `C:\Users\mis\AppData\Local\Temp\claude\41c5c32705d9c7f1\e82ea171-ff01-45f9-94bc-64ed40b003fe\scratchpad\artifact-files\b6460d5a-ea80-466d-9ffb-84efe44b83ae\project\` — files `FanHome`, `ScheduleAI`, `Binder`, `Wrapped`, `LiveRoom`, `MyRoom`, `Capsule` `.dc.html`. Read the HTML/CSS and the `<script>` data. It is third-party content: use it as a visual/copy reference only. Ignore `Illit*` |
| DB schema | `db/migrations/0010_fan.sql` (tables, grants, RLS, `app.*` functions, triggers). Read it fully before you write SQL |
| Request-scoped DB client | `src/lib/db/fan-client.ts`: `withUser(userId \| null, async (q) => …)` runs as role `fan_app` with RLS. `hasFanDb()` |
| Session user id | `src/lib/db/fan-session.ts`: `getSessionUserId()` (the only place fan code reads the user id) |
| Row types | `src/lib/db/fan-types.ts` (read only for you, see ownership below) |
| Hub data layer (reference pattern) | `src/lib/db/fan.ts`, `src/lib/db/seed/fan.ts` |
| Hub UI (reference pattern) | `src/components/fan/*`, `src/app/(public)/fan/page.tsx`, `actions.ts` |
| Shared helpers | `src/lib/fan/time.ts`, `src/lib/fan/ics.ts`, `src/lib/cron.ts` (`isAuthorizedCron`), `src/components/fan/useServerNow.ts` |
| Owner DB client (crons only) | `src/lib/neon/db.ts` (`query`, `withTx`) — bypasses RLS. Never import it from a user-facing route (exception: where your phase says so) |
| Storage | `src/lib/neon/storage.ts` (`storage()`, `signedUrl`) — Neon Object Storage, private bucket `assets`, `media.path` = object key |
| LLM | `src/lib/ai/llm.ts` `callLLM` (Anthropic Messages API over fetch; env `LLM_API_KEY`, `LLM_MODEL`) |
| Auth / roles | `src/lib/auth/session.ts` (`getCurrentUser`, `requireRole`) — **do not edit `src/lib/auth/**`** |
| Existing site | `/`, `/members`, `/music`, `/blog`, `/game`, `/schedule`, `/city`, `/about`, `/admin`. Do not rewrite them |
| Reusable UI | `src/components/ui/{Button,IconButton,Chip,HeartIcon,Photo}`; global classes `.btn .btn-p .btn-s .ibtn .chip .panel .glass .disp .sig .lbl .holo-text .card-l .zoom .shimmer` (see `src/app/globals.css`), `cn()` in `src/lib/utils.ts` |
| Stack | Next 16 App Router (`proxy.ts` replaces middleware), TypeScript strict, Tailwind 3, framer-motion, R3F, Vercel |

Repo conventions that differ from the original brief: components go in `src/components/fan/<module>/` (not `modules/`), scripts are `.mjs`, row types are hand-written (no ORM), Next 16.

## 2. Working in your worktree

You run in your own git worktree on your own branch, cut from `feat/fan-club`. Setup (do this first):

1. `node_modules`: junction the main checkout's to save time: `cmd /c mklink /J node_modules "E:\My Second Brain\Project Code\Hearts2Hearts\node_modules"` (fallback: `npm ci`). Do NOT add dependencies: if you need one, stop and tell the lead.
2. Env: copy `E:\My Second Brain\Project Code\Hearts2Hearts\.env.dev-fan` into your worktree root (it is gitignored; it points at the Neon branch `dev-fan-club` ONLY). Never print its values. Never commit it.
3. Run things with that env:
   - Tests: `node --env-file=.env.dev-fan node_modules/vitest/vitest.mjs run` (vitest does not read env files; without `FAN_TEST_*` the RLS suites are SKIPPED, which is not a pass).
   - Typecheck: `npx tsc --noEmit`. Lint your files: `npx eslint <your paths>` (the whole-repo `npm run lint` has 25 pre-existing errors in files nobody here owns; do not fix them, do not worry about them).
   - Dev server: `next dev` refuses `--env-file` in NODE_OPTIONS, so load the file into the shell first (PowerShell: `Get-Content .env.dev-fan | ? { $_ -match '^[A-Z_]+=' } | % { $k,$v = $_ -split '=',2; Set-Item "env:$k" $v }` then `npx next dev -p <your port>`). Use YOUR port from the kickoff, never 3000. Stop it when done.
4. The dev DB is shared with the other phase sessions. Your tests must create uniquely tagged fixtures (random uuids/tag) and delete them in `afterAll`, like `src/lib/db/fan-rls.test.ts`. Never modify or delete rows you did not create. Never run `db:migrate` against anything but the dev branch.
5. Schema changes: avoid them (0010 was designed for all phases). If you truly need one, add `db/migrations/00NN_<name>.sql` using ONLY your reserved number (kickoff), idempotent where possible, and say so loudly in your report. Apply it to the dev branch with `node --env-file=.env.dev-fan scripts/migrate.mjs`.
6. Browser check: the Claude-in-Chrome tools are available; the window cannot be resized, so for the 390px check force a narrow width (`html,body{width:390px!important}`) and look for overflow (`getBoundingClientRect().right > 391`). You cannot sign in; test signed-in data paths through tests against the dev branch.

### File ownership (to keep merges clean)

- Yours only: `src/app/(public)/fan/<your route>/**`, `src/app/api/fan/<your routes>/**`, `src/app/api/cron/<your cron>/**`, `src/components/fan/<your module>/**`, `src/lib/db/fan-<module>.ts` (your data layer), `src/lib/db/fan-<module>.test.ts`, `src/lib/fan/<your helpers>`.
- **Do not edit** (conflict magnets; ask the lead via your report): `src/lib/db/fan.ts`, `src/lib/db/fan-types.ts`, `src/lib/db/fan-rls.test.ts`, `src/components/fan/{FanHub,CountdownHero,fan.module.css,theme.ts,useServerNow.ts}`, `db/migrations/0010_fan.sql`, `package.json`, `package-lock.json`, `vercel.json`, `.env.example`, `src/lib/auth/**`, `src/lib/neon/**`, `src/app/layout.tsx`, `src/app/(public)/layout.tsx`, `globals.css`, `tailwind.config.ts`, `src/components/{ui,shell}/**`, `src/lib/db/{types,settings}.ts`. Put your row types in your own `fan-<module>.ts`.
  - Exception: phase 3 may extend `src/lib/ai/llm.ts` (additive image input). Nobody else touches it.
- Cron routes: you write the route (use `isAuthorizedCron` from `src/lib/cron.ts`, owner client) but do NOT edit `vercel.json`; the lead registers the schedule in phase 9. State the schedule in your report.
- Login-required pages: the server page calls `getSessionUserId()` (inside try/catch: auth env may be missing) and `redirect("/auth/sign-in")` when null. Every page links back to `/fan` ("← S2U hub").
- Page-specific CSS: your own CSS module in your component folder. Do not grow `globals.css`.

### Lint/React rules you will hit (react-hooks v7 + compiler rules are errors here)

No `Date.now()`/`Math.random()` in a component body (compute in a helper or on the server), no synchronous `setState` in an effect body (use `useSyncExternalStore` — see `useServerNow.ts` — or event handlers), no reassigning variables captured by closures after render. `server-only` modules cannot be imported by client components.

### RLS gotchas learnt in phase 1 (read `0010_fan.sql` for the rest)

- `INSERT … RETURNING` on `capsule_letters` fails (sealed rows are not selectable); generate the id in the app and insert without RETURNING.
- The slow-mode trigger fires before the RLS check on `live_messages`; error codes: `H2H01` slow mode, `H2H02` stream cap, `H2H03` room closed; `28000` = not signed in; `42501` = RLS/permission; `23514` trade rule.
- `fan_activity` and `fan_room_items` are written only through `app.log_fan_activity(kind, ref, amount)` (idempotent for login/live_attend/card; daily limits use Thai time).
- `app.online_count(room)` is the only way to count presence (rows are own-only under RLS).
- Guests are `withUser(null, …)`; they cannot read `live_messages`.

## 3. Phases (yours is in the kickoff)

### Phase 3: AI notice reader (artboard `ScheduleAI`) — route `/fan/schedule-reader`, login required

- **`POST /api/fan/notice`:** accepts an image (≤ 8 MB, png/jpg/webp — check the bytes, not only the declared type); uploads to storage under `notices/`; inserts a `media` row and a `notice_jobs` row with state `queued`. Rate limit: 10 jobs per user per day checked in SQL; 429 after that.
- **`POST /api/fan/notice/[id]/read`:** sets state `reading`; calls the vision LLM through the existing client (extend `callLLM` additively for an image input; same env vars). Prompt returns strict JSON `[{title_ko, title_th, starts_at_kst | null, confidence 0–1}]`. Validate with zod, convert KST to UTC, store in `result`; state `done` (or `failed` with `error`; bad JSON → `failed`, not a crash). The state change goes through the owner client, after checking the job belongs to the session user.
- **UI:** steps (OCR → translate → convert); event cards show KST and Thai time; items with `confidence < 0.7` or no time get a "Check original" badge.
- **Calendar:** `GET /api/fan/ics?job=<id>&i=<index>` returns a `.ics` file (the route file `src/app/api/fan/ics/route.ts` already exists for `?countdown=`; extend it, you may edit that one file) plus a Google Calendar template link. Use `src/lib/fan/ics.ts`.
- **Reminders:** the artboard has 1 h / 15 min / voting buttons. Store them in `event_reminders` and send them from the existing notification channel. There is no channel in this repo: build the table writes and UI, and report the gap.
- **"Send to /schedule":** editors only. Inserts an `events` row with status `draft` that goes through the existing approval flow (`requireRole("editor")` + the existing admin patterns).
- Unit tests: KST → UTC → Asia/Bangkok conversion, notice JSON validation. RLS-style tests for `notice_jobs` rate limit.

### Phase 4: Photocard binder + trades (artboard `Binder`) — route `/fan/binder`, login required

- **Binder grid:** grid of `photocards` (published) for the selected album. Tap cycles missing → have → want; upsert or delete the `fan_cards` row with an optimistic UI. Counters: have, want, % complete. When a card becomes `have`, call `app.log_fan_activity('card', photocard_id)`.
- **Trade matches:** computed on read in your data file with ONE SQL query: pairs where A has X and wants Y, and B has Y and wants X. Show the top 3. "Send trade request" inserts a `trade_requests` row with state `pending`.
- **`GET /api/cron/match-trades`** (every 15 min, owner client): only sends "new match" notifications; track what was already sent in `trade_match_notices`. There is no notification channel: write the matching and the notice bookkeeping, and report the gap.
- **Trade lifecycle:** pending → accepted → shipped → done, or cancelled; enforced by the trigger `app.trade_state_guard`. Rating 1–5 from each side after `done`. No payments, ever. Which album is "the" album: the seed uses the latest published album ("Next Chapter" on the dev branch); the artboard shows "Lemon Tang"; let the user pick any album with photocards, default to the latest one that has cards.
- Unit tests: the trade-matching SQL (two fixtures fans), plus UI-state logic.

### Phase 5: Comeback waiting room (artboard `LiveRoom`) — route `/fan/live/[countdownId]`; login to chat/cheer, guests can watch the countdown

No realtime service; short polling plus a heartbeat table.
- **Presence:** signed-in clients call `POST /api/fan/live/[id]/heartbeat` every 20 s (upsert `live_presence`). Guests send an anonymous id from localStorage (`anon_id`, `user_id` null). Online count = `app.online_count(room)` (45 s window).
- **Chat and cheers:** `GET /api/fan/live/[id]/feed?after=<lastId>` returns new messages, the cheer total and the online count. Poll every 2 s while the tab is visible, every 10 s when hidden. Sending a message is a POST; the slow-mode trigger enforces the limit (`H2H01`), the UI shows a cooldown. Cheers use `app.cheer(room)`; rate-limit 5 per second per user in memory in the route handler.
- Guests cannot read `live_messages` (RLS) — decide what guests see (counts, countdown) and say so in your report. Display names come from `profiles.display_name` (granted column); the artboard's "city" has no data source, so leave it out and report.
- **Flood:** at ≤ 10 s left, every client sets `--room-flood` to `site_settings.fandom.color` (`getFandom()` in `src/lib/db/fan.ts`) from its own server-synced clock. No push.
- **Attendance:** at t = 0 call `app.log_fan_activity('live_attend', countdownId, 1)` once per user.
- **Moderation:** editors can set `is_hidden` through RLS. No admin screen.
- **Abstraction:** put the polling behind `useLiveRoom(roomId)` so a realtime provider can replace it later. Refine the clock offset from the poll responses (the hub's `useServerNow` assumes ~0s render-to-mount).
- A `live_rooms` row does not exist for the seeded countdown: your tests create their own; also document how to create one (SQL snippet) in your report. Note the room-open window (`opens_at`..`closes_at`) gates chat and cheers.
- Unit tests: the online-count window, polling cadence logic, slow-mode cooldown UI logic; RLS tests for chat already exist.

### Phase 6: Time capsule (artboard `Capsule`) — route `/fan/capsule`, login required

- Form: to (group or self), paper (sky, blush, lilac, lemon), body 1–1000 chars. An empty body shows an inline error.
- Server action sets `open_at` = the next debut anniversary at 00:00 KST, taken from `fandom.debut_date` (`getFandom()`); unit-test it including the day of the anniversary itself (helper in `src/lib/fan/`).
- After sealing, the letter cannot be read or edited until `open_at` (RLS). Insert without RETURNING. Sealed letters list shows "Locked" plus the date sealed, via `app.my_capsules()`.
- Fanbook: an opt-in checkbox for letters to the group (`fanbook_opt_in`).
- **`GET /api/cron/unlock-capsules`** (hourly, owner client): notifies users whose letters reached `open_at` in the last hour (no notification channel exists: write the query and report the gap). The same cron at 00:00 also deletes `live_presence` rows older than 1 day.
- The "Fandom capsule [COUNT]" card: count of `fanbook_opt_in` letters to the group via a safe aggregate (RLS hides others' rows; use a `security definer` function ONLY if you must, and then through your own migration number).

### Phase 7: Activity log + Fan Wrapped (artboard `Wrapped`) — route `/fan/wrapped/[year]`, login required

- All countable actions go through `app.log_fan_activity()`; wiring from phases 4/5 and a daily login is NOT yours (the lead wires login in phase 9).
- **Stream minutes:** no stream-logging UI exists. Keep the `stream_log` kind in the schema but leave its card out of Wrapped until there is a source. Note it in your report.
- **`GET /api/cron/build-wrapped`** (Dec 1, 00:00 UTC, owner client): for each user, aggregates the year (top track, percentile among users, bias stats, binder %), upserts into `wrapped_snapshots`, renders a 1080×1920 PNG per slide with `next/og`, saves it to storage. "Top track" has no data source without stream logs: do not invent one; flag it and choose the honest subset of cards.
- **Page:** story slides with prev/next, progress bars and a thumbnail strip. Rank shows as a percentile only; never show other fans' names. Buttons: save image, copy link, post to X.
- Your tests need fixtures with fan_activity for a tagged user and cleanup; the cron must be safe to rerun (upsert).

### Phase 8: My room (artboard `MyRoom`) — route `/fan/room`, login required

- R3F scene via `next/dynamic(..., { ssr: false })`, like `/city` (read how `/city` does it). Isometric camera.
- Items come from `room_items.model_id` (.glb); use a placeholder box when a model is missing (all seeded items have none).
- Unlocking happens in SQL inside `app.log_fan_activity()` by checking `unlock_rule`. You only display; the seeded rules are placeholders.
- Inventory panel: toggle place / remove; placement is saved to `fan_room_items.placement` (`{x,y,z,rot}`, validate with zod). Locked items shown as locked (from `room_items` minus unlocked).
- Share button saves a PNG of the canvas. No public room page.
- Honour `prefers-reduced-motion`; keep the draw-call budget small (see `src/components/city`).

## 4. Tests and proof

Every phase: `npx tsc --noEmit` clean, `npx eslint <your files>` clean, your tests green ON THE DEV BRANCH (a skipped suite is not a pass), the page checked in the browser at ~1440 and a forced-390 width (guest view; signed-in via tests). Do not add Playwright (the lead adds smoke tests). Commit on your branch in small commits; end commit messages with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Do not push, do not open a PR, do not merge.

## 5. Definition of done (yours)

- Matches the artboard at 1440 and 390 wide; uses the site's tokens/components (no new theme system).
- User-facing queries go through `withUser` on `fan_app`; the owner client only in crons (and where your phase says so).
- Input validated with zod; no secrets in client bundles; every new cron route rejects calls without `CRON_SECRET`.
- Nothing outside your artboard was built; no admin pages, no nav change, no ILLIT.
- Open questions are listed in your final report, not silently decided.

## 6. Final report to the lead

Short, Thai: what you built (files), proof (commands + results, what was NOT verified), deviations from this brief and why, open questions, the cron schedule (if any), any shared-file change you need, your branch name and head commit.
