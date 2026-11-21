# Hearts2Hearts fan site (H2H·S2U) — project rules

Unofficial fan site. Next.js 16 App Router + TypeScript + Tailwind 3 on **Neon** (Postgres via `pg`, Neon Auth = Managed Better Auth, Object Storage bucket `assets`). Supabase is NOT used any more. **Hearts2Hearts only — ILLIT is out of scope.**

## Neon (replaces Supabase)
- DB: `import { query, queryOne, withTx, hasDb } from "@/lib/neon/db"` (server only, pooled `DATABASE_URL`, parameterised SQL `$1..`; never interpolate input). DDL/migrations use `DATABASE_URL_UNPOOLED`.
- Auth: `src/lib/auth/{server,client,session}.ts`. Server: `getCurrentUser()` / `requireRole("editor"|"admin")` (returns null when not allowed → respond 401/403). Identity = `neon_auth."user"` (uuid id); app role + ban live in `public.profiles` (created lazily by `getCurrentUser`). **There is no RLS-as-authorization any more: every write path must call `requireRole` itself.** Public reads must filter `status='published'` (and posts `published_at <= now()`) in SQL.
- Storage: `src/lib/neon/storage.ts` (`storage()`, `signedUrl(key)`); `media.path` = object key in private bucket `assets`.
- Next 16: `middleware.ts` is `proxy.ts`.

## Source of truth
- Visual design: `design/project/*.dc.html` (one artboard per page; read the HTML/CSS + the `<script>` data arrays). Match look, spacing, copy, states. Ignore `Illit*` (not in the folder).
- System spec: `docs/spec.md`; schema: `docs/schema-from-spec.sql`; row types: `src/lib/db/types.ts`.
- Design tokens/classes are ported in `src/app/globals.css`; Tailwind maps them in `tailwind.config.ts`.

## Reuse before writing
`src/components/ui/{Button,IconButton,Chip,HeartIcon}`, `src/components/shell/{Navbar,Footer}` (already mounted by `src/app/(public)/layout.tsx`), `cn()` in `src/lib/utils.ts`, nav list `src/lib/nav.ts`, Supabase clients in `src/lib/supabase/*`.
Design classes available: `.btn .btn-p .btn-s .ibtn .chip .panel .glass .disp .sig .lbl .holo-text .card-l .zoom .clamp2 .clamp3 .shimmer`.

## Conventions
- Server Components by default; `"use client"` only for interactivity (game, player, 3D, filters, carousels). 3D via `next/dynamic` with `ssr:false`.
- Data access: one file per module `src/lib/db/<module>.ts` exporting async functions. Public reads go through `unstable_cache(..., { tags: [<module tag from docs/spec.md §3>] })`. If `hasDb()` is false, return seed data from `src/lib/db/seed/<module>.ts` (transcribe the arrays from the design's `<script>`), so the site runs without a database. Never hardcode content in components.
- No real photos exist: use the design's gradient placeholders (`color_hex` etc.), never invent images.
- Accessibility: real `<button>`/`<a>`, `aria-label` on icon-only buttons, 2px pink focus ring (already global), honour `prefers-reduced-motion`.
- Page-specific CSS → your own `src/app/**/<page>.css` or CSS module imported by your page. Do not grow `globals.css`.
- Responsive: pages are fluid (design is 1440 wide, must work at 390).

## Parallel-work rules (several Claude sessions share this folder, no git)
- Touch ONLY the files your brief lists. Do not edit: `package.json`, `globals.css`, `tailwind.config.ts`, `src/components/ui/**`, `src/components/shell/**`, `src/lib/db/types.ts`, `src/lib/db/settings.ts`, `src/lib/neon/**`, `src/lib/auth/**`, `src/app/api/auth/**`, `neon.ts`, `src/app/layout.tsx`, `src/app/(public)/layout.tsx`.
- Need a change to a shared file or a new dependency → append a line to `docs/shared-requests.md` (what + why) and keep going; don't edit it.
- Don't run `next build`/`next dev` on port 3000 concurrently with others: use `npx tsc --noEmit` for proof; if you start a dev server pick your own port (`next dev -p <your port>`).
- Commit only when the owner asks.
