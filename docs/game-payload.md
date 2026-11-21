# Game payloads & scoring

Types: `src/lib/db/seed/game.ts` (payloads), `src/components/game/rules.ts` (scoring, shared by client and API).
Loader: `getGameData()` in `src/lib/db/game.ts` (cache tag `game`). Uses the seed (`src/lib/db/seed/game.ts`) only when `!hasDb()` (no `DATABASE_URL`). With a database, an empty/unusable `game_items` table gives empty states: Quiz locks ("No questions yet") until ≥1 valid question exists, Memory locks ("No cards yet") until exactly 8 valid `card` rows exist. A failed query is logged and treated as empty.

## `game_items.payload` by `kind`

### `kind = 'question'` (Quiz, 5 rounds in the design; any number ≥ 1 works)
```json
{ "text": "Who was born in Bali?", "options": ["Stella", "Carmen", "Yuha", "Ian"], "answer": "Carmen", "note": "Carmen joined through SM’s Jakarta global audition." }
```
- `options`: 2–4 strings (design uses 4). `answer` MUST be one of `options` (rows that break this are ignored).
- `note`: one verified fact shown after answering. Facts only, no member quotes.
- Option colour dots come from the `card` rows (matched by `name`).

### `kind = 'card'` (Memory Match)
```json
{ "name": "Jiwoo", "color_hex": "#FFB3CF" }
```
- Exactly **8** active `card` rows are required (one per member). Otherwise Memory Match is locked (no seed fallback when a database exists). The deck is each card twice, shuffled.
- The same rows drive the photocard reward on the result screen.

`sort_order` orders questions; `is_active = false` hides a row.

## Scoring

Each round is normalised to **points 0–1000** so both games share one leaderboard (`game_scores.score`, season `S1`).

| game (`game` in API) | raw | points |
|---|---|---|
| `quiz` | correct answers 0–5 | `raw × 200` |
| `memory` | `round(max(1, 8 − max(0, moves − 8) / 2))` → 1–8 | `raw × 125` |

## `POST /api/game/score`

Request: `{ "game": "quiz" | "memory", "score": <points> }`
Response `201`: `{ "ok": true, "rank": n, "score": n, "season": "S1" }`; errors `{ "ok": false, "error": code }`.

Checks, in order: same-origin (`403 bad_origin`) → JSON body (`400 invalid_json`) → game known (`400 invalid_game`) → score is an integer on the game's grid and ≤ per-round cap (`422 invalid_score`) → `hasDb()` (`503 not_configured`) → `getCurrentUser()` from `src/lib/auth/session.ts` (`401 login_required`; it also returns null for banned fans) → one parameterised statement that inserts into `game_scores` only if the fan has no score newer than the game's minimum round time, quiz 3 s / memory 8 s (`429 too_fast`) → rank (1 + number of other non-banned fans whose best score this season is higher; SQL `group by … having max(score) > $3`) → `revalidateTag('game', 'max')`.

`GET /api/game/score` → `{ ok, season, rows: [{ rank, name, score, played_at }] }`: top 10, best round per fan (`profiles.display_name` join), banned fans excluded.

`GET /api/game/me` → `{ online, user: { id, name } | null }` (never cached). `online` = a database exists. The page uses it for the Online tab and LoginGate; no browser DB client.

Anti-cheat is basic by design (spec §3): the server cannot see the round itself, so it only bounds what a signed-in fan can post.
