// Seeds the fan club (migration 0010): site_settings.fandom, album era colors, missing member colors,
// the next-anniversary countdown, 2 versions of every member's photocard for the latest album, and 7 room items.
// Idempotent: every insert is `on conflict do nothing` / `where not exists`, every update only fills empty values,
// so CMS edits are never overwritten.
// Runs as the OWNER (DATABASE_URL_UNPOOLED, bypasses RLS). Point it at your Neon dev branch first.
// Usage: node --env-file=.env.local scripts/seed-fan.mjs
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set (run with: node --env-file=.env.local scripts/seed-fan.mjs)");
  process.exit(1);
}

const FANDOM = { name: "S2U", name_native: "하츄", color: "#A8D8FF", debut_date: "2025-02-24" };

// Titles are matched case-insensitively ("RUDE!" in the design, "Rude!" in the database).
const ERA_THEMES = [
  ["The Chase", "#DDF0FF", "#A8D8FF"],
  ["Style", "#FFE3F1", "#FFB6D5"],
  ["Focus", "#E9E1FF", "#C9B6FF"],
  ["RUDE!", "#FFD6DE", "#FF8FB8"],
  ["Lemon Tang", "#FFF6C9", "#FFE08A"],
  ["Iconic Heart", "#FFE3F1", "#C9B6FF"],
];

// Site-assigned colors, not official ones. 0001 gives members.color_hex a default of #F9A8D4, which is how "no color yet" shows up.
const MEMBER_DEFAULT_COLOR = "#F9A8D4";
const MEMBER_COLORS = [
  ["Jiwoo", "#FFB3CF"], ["Carmen", "#FFC9A8"], ["Yuha", "#FFE08A"], ["Stella", "#A8D8FF"],
  ["Juun", "#BFF0DA"], ["A-na", "#C9B6FF"], ["Ian", "#9FD8E8"], ["Ye-on", "#F6B3E0"],
];

// 2nd anniversary: Feb 24, 2027 00:00 KST (UTC+9, no DST).
const ANNIVERSARY = { title: "2nd anniversary with S2U", kind: "anniversary", target_at: "2027-02-23T15:00:00Z" };

const VERSIONS = ["A", "B"];

// Unlock rules are PLACEHOLDERS: the design lists where each item comes from, but not a number. `count` is the sum of
// fan_activity.amount for `kind`. The 7-day login item counts login DAYS, not a consecutive streak. Edit in the Neon console.
const ROOM_ITEMS = [
  ["sky-blue-rug", "Sky blue rug", { kind: "login", count: 1 }],
  ["lemon-tang-poster", "Lemon Tang poster", { kind: "mission", count: 1 }],
  ["bias-card-frame", "Bias card frame", { kind: "card", count: 8 }],
  ["fairy-lights", "Fairy lights", { kind: "login", count: 7 }],
  ["album-shelf", "Album shelf", { kind: "mission", count: 3 }],
  ["lightstick-lamp", "Lightstick lamp", { kind: "live_attend", count: 1 }],
  ["i-was-here-badge", "“I was here” badge", { kind: "live_attend", count: 2 }],
];

const c = new pg.Client({ connectionString: url });
await c.connect();
const report = { host: new URL(url).hostname, themed: [], themeMissing: [], colored: [], countdown: null, photocardAlbum: null, photocards: 0, roomItems: 0 };
try {
  await c.query("begin");

  await c.query("insert into site_settings (key, value) values ('fandom', $1::jsonb) on conflict (key) do nothing", [JSON.stringify(FANDOM)]);

  for (const [title, from, to] of ERA_THEMES) {
    const r = await c.query(
      "update albums set theme_from = $2, theme_to = $3 where lower(title) = lower($1) and theme_from is null and theme_to is null",
      [title, from, to],
    );
    const exists = await c.query("select 1 from albums where lower(title) = lower($1)", [title]);
    (exists.rowCount ? report.themed : report.themeMissing).push(`${title}${r.rowCount ? "" : " (kept existing)"}`);
  }

  for (const [name, hex] of MEMBER_COLORS) {
    const r = await c.query("update members set color_hex = $2 where lower(stage_name) = lower($1) and color_hex = $3", [name, hex, MEMBER_DEFAULT_COLOR]);
    if (r.rowCount) report.colored.push(name);
  }

  const cd = await c.query(
    `insert into countdowns (title, kind, target_at, status)
     select $1, $2, $3::timestamptz, 'published'
      where not exists (select 1 from countdowns where kind = $2 and target_at = $3::timestamptz)
     returning id`,
    [ANNIVERSARY.title, ANNIVERSARY.kind, ANNIVERSARY.target_at],
  );
  report.countdown = cd.rowCount ? "created" : "already there";

  const album = (await c.query("select id, title from albums where status = 'published' order by release_date desc nulls last limit 1")).rows[0];
  if (album) {
    report.photocardAlbum = album.title;
    const members = (await c.query("select id from members where status = 'published' order by sort_order")).rows;
    for (const [mi, m] of members.entries()) {
      for (const [vi, version] of VERSIONS.entries()) {
        const r = await c.query(
          `insert into photocards (album_id, member_id, version, sort_order, status) values ($1, $2, $3, $4, 'published')
           on conflict (album_id, member_id, version) do nothing`,
          [album.id, m.id, version, mi * VERSIONS.length + vi],
        );
        report.photocards += r.rowCount ?? 0;
      }
    }
  }

  for (const [slug, name, rule] of ROOM_ITEMS) {
    const r = await c.query(
      "insert into room_items (slug, name, unlock_rule, status) values ($1, $2, $3::jsonb, 'published') on conflict (slug) do nothing",
      [slug, name, JSON.stringify(rule)],
    );
    report.roomItems += r.rowCount ?? 0;
  }

  await c.query("commit");
  console.log(JSON.stringify(report, null, 1));
} catch (e) {
  await c.query("rollback");
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
