// RLS integration tests for migration 0010, run through the real withUser() as the non-owner role fan_app.
//
// Needs a Neon BRANCH with 0010 applied (never production). Fixtures are created and removed per run:
//   FAN_TEST_OWNER_URL  owner connection string of that branch (direct, DATABASE_URL_UNPOOLED style)
//   FAN_TEST_APP_URL    fan_app connection string of the same branch
// These two variables are deliberately NOT the app's DATABASE_URL*, so a stray .env.local can never point the tests at prod.
// Without them the whole suite is skipped (vitest reports it as skipped, not passed).
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOrCreateFanMe, saveFanTheme } from "./fan";
import { withUser } from "./fan-client";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;

const rejectsWith = (p: Promise<unknown>, code: string) => expect(p).rejects.toMatchObject({ code });
const n = async (user: string | null, sql: string, params: unknown[] = []) =>
  withUser(user, async (q) => (await q<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params))[0].n);

describe.skipIf(!enabled)("fan RLS (fan_app)", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const [A, B, C, E, X, M] = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const id = {
    album: randomUUID(), member: randomUUID(), media: randomUUID(),
    pc1: randomUUID(), pc2: randomUUID(), pcDraft: randomUUID(),
    cdPub: randomUUID(), cdDraft: randomUUID(), room: randomUUID(),
    itemPub: randomUUID(), itemDraft: randomUUID(),
    jobA: randomUUID(), msgVisible: 0, msgHidden: 0,
  };
  const tag = randomUUID().slice(0, 8);

  async function trade(from: string, to: string, state = "pending") {
    const tid = randomUUID();
    await owner.query(
      "insert into trade_requests (id, from_user, to_user, give_card_id, get_card_id, state) values ($1,$2,$3,$4,$5,$6)",
      [tid, from, to, id.pc1, id.pc2, state],
    );
    return tid;
  }
  const setTrade = (user: string, tid: string, set: string, params: unknown[] = []) =>
    withUser(user, (q) => q<{ state: string }>(`update trade_requests set ${set} where id = $1 returning state`, [tid, ...params]));

  beforeAll(async () => {
    await owner.connect();
    const users: [string, string, boolean][] = [[A, "fan", false], [B, "fan", false], [C, "fan", false], [E, "editor", false], [X, "fan", true], [M, "fan", false]];
    for (const [uid, role, banned] of users) {
      await owner.query(
        `insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
        [uid, `rls-${tag}`, `rls-${tag}-${uid.slice(0, 6)}@test.invalid`],
      );
      await owner.query("insert into profiles (id, display_name, role, is_banned) values ($1, $2, $3, $4)", [uid, `rls-${tag}`, role, banned]);
    }
    await owner.query("insert into albums (id, slug, title, album_type, status) values ($1, $2, $3, 'single', 'published')", [id.album, `rls-${tag}`, `RLS ${tag}`]);
    await owner.query("insert into members (id, slug, stage_name, status) values ($1, $2, $3, 'published')", [id.member, `rls-${tag}`, `RLS ${tag}`]);
    await owner.query("insert into media (id, path, mime_type) values ($1, $2, 'image/png')", [id.media, `rls-test/${tag}.png`]);
    for (const [pid, version, status] of [[id.pc1, "A", "published"], [id.pc2, "B", "published"], [id.pcDraft, "C", "draft"]]) {
      await owner.query("insert into photocards (id, album_id, member_id, version, status) values ($1,$2,$3,$4,$5)", [pid, id.album, id.member, version, status]);
    }
    for (const [cid, status] of [[id.cdPub, "published"], [id.cdDraft, "draft"]]) {
      await owner.query("insert into countdowns (id, title, kind, target_at, status) values ($1, $2, 'release', now() + interval '1 day', $3)", [cid, `RLS ${tag}`, status]);
    }
    await owner.query(
      "insert into live_rooms (id, countdown_id, opens_at, closes_at, slow_mode_sec) values ($1, $2, now() - interval '1 hour', now() + interval '1 hour', 60)",
      [id.room, id.cdPub],
    );
    await owner.query("insert into room_items (id, slug, name, unlock_rule, status) values ($1, $2, 'rls pub', '{\"kind\":\"login\",\"count\":1}', 'published')", [id.itemPub, `rls-pub-${tag}`]);
    await owner.query("insert into room_items (id, slug, name, unlock_rule, status) values ($1, $2, 'rls draft', '{\"kind\":\"login\",\"count\":1}', 'draft')", [id.itemDraft, `rls-draft-${tag}`]);
    // chat fixtures, one author each (slow mode would reject a second message from the same author): one visible, one hidden
    const v = await owner.query("insert into live_messages (room_id, user_id, body) values ($1, $2, 'visible') returning id", [id.room, E]);
    const h = await owner.query("insert into live_messages (room_id, user_id, body, is_hidden) values ($1, $2, 'hidden', true) returning id", [id.room, M]);
    id.msgVisible = Number(v.rows[0].id);
    id.msgHidden = Number(h.rows[0].id);
  });

  afterAll(async () => {
    try {
      // users first (cascades every fan table), then the content they pointed at
      await owner.query("delete from neon_auth.\"user\" where id = any($1)", [[A, B, C, E, X, M]]);
      await owner.query("delete from albums where id = $1", [id.album]);
      await owner.query("delete from members where id = $1", [id.member]);
      await owner.query("delete from countdowns where id = any($1)", [[id.cdPub, id.cdDraft]]);
      await owner.query("delete from room_items where id = any($1)", [[id.itemPub, id.itemDraft]]);
      await owner.query("delete from media where id = $1", [id.media]);
    } finally {
      await owner.end();
    }
  });

  it("connects as a role that does not bypass RLS", async () => {
    const [r] = await withUser(A, (q) => q("select rolbypassrls, rolsuper from pg_roles where rolname = current_user"));
    expect(r).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it("1. a fan cannot read another fan's private rows", async () => {
    await withUser(A, async (q) => {
      await q("insert into fan_cards (user_id, photocard_id, state) values ($1, $2, 'have')", [A, id.pc1]);
      await q("insert into notice_jobs (id, user_id, image_id) values ($1, $2, $3)", [id.jobA, A, id.media]);
      await q("insert into event_reminders (user_id, job_id, item_index, remind_at, kind) values ($1, $2, 0, now() + interval '1 hour', '1h')", [A, id.jobA]);
      await q("insert into capsule_letters (user_id, to_kind, body, open_at) values ($1, 'self', 'hello', now() + interval '30 days')", [A]);
    });
    await owner.query("insert into wrapped_snapshots (user_id, year, data) values ($1, 2026, '{}')", [A]);

    for (const [table, mine] of [["fan_cards", 1], ["notice_jobs", 1], ["event_reminders", 1], ["wrapped_snapshots", 1]] as const) {
      expect(await n(A, `select 1 from ${table} where user_id = $1`, [A]), `${table} owner sees own row`).toBe(mine);
      expect(await n(B, `select 1 from ${table} where user_id = $1`, [A]), `${table} other fan sees nothing`).toBe(0);
    }
    // sealed capsule: nobody (the author included) can select it, so the count is 0 for both
    expect(await n(B, "select 1 from capsule_letters where user_id = $1", [A])).toBe(0);
    // a fan cannot write rows as someone else
    await rejectsWith(withUser(B, (q) => q("insert into fan_cards (user_id, photocard_id, state) values ($1, $2, 'want')", [A, id.pc2])), "42501");
  });

  it("2. a capsule is sealed until open_at and never editable", async () => {
    await withUser(A, async (q) => {
      expect(await q("select body from capsule_letters where user_id = $1", [A])).toEqual([]);
      const mine = await q("select * from app.my_capsules()");
      expect(mine).toHaveLength(1);
      expect(Object.keys(mine[0])).not.toContain("body");
    });
    await rejectsWith(withUser(A, (q) => q("update capsule_letters set body = 'changed' where user_id = $1", [A])), "42501");
    await rejectsWith(withUser(A, (q) => q("delete from capsule_letters where user_id = $1", [A])), "42501");
    // cannot seal a letter that is already open
    await rejectsWith(
      withUser(A, (q) => q("insert into capsule_letters (user_id, to_kind, body, open_at) values ($1, 'self', 'x', now() - interval '1 minute')", [A])),
      "42501",
    );
    // once open_at has passed (owner back-dates one), the author can read it, and only the author
    const opened = randomUUID();
    await owner.query("insert into capsule_letters (id, user_id, to_kind, body, open_at) values ($1, $2, 'self', 'opened', now() - interval '1 hour')", [opened, A]);
    expect(await n(A, "select 1 from capsule_letters where id = $1", [opened])).toBe(1);
    expect(await n(B, "select 1 from capsule_letters where id = $1", [opened])).toBe(0);
  });

  it("3. a second message inside slow_mode_sec fails", async () => {
    await withUser(A, (q) => q("insert into live_messages (room_id, user_id, body) values ($1, $2, 'first')", [id.room, A]));
    await rejectsWith(withUser(A, (q) => q("insert into live_messages (room_id, user_id, body) values ($1, $2, 'second')", [id.room, A])), "H2H01");
    // slow mode is per user: another fan is not blocked
    await withUser(B, (q) => q("insert into live_messages (room_id, user_id, body) values ($1, $2, 'hi')", [id.room, B]));
    // a message cannot be posted as someone else (C has no recent message, so slow mode does not fire first)
    await rejectsWith(withUser(B, (q) => q("insert into live_messages (room_id, user_id, body) values ($1, $2, 'spoof')", [id.room, C])), "42501");
  });

  it("4. a banned user cannot post, cheer or log activity", async () => {
    await rejectsWith(withUser(X, (q) => q("insert into live_messages (room_id, user_id, body) values ($1, $2, 'hello')", [id.room, X])), "42501");
    await rejectsWith(withUser(X, (q) => q("select app.cheer($1)", [id.room])), "42501");
    await rejectsWith(withUser(X, (q) => q("select app.log_fan_activity('login')")), "42501");
  });

  it("5. fan_activity and fan_room_items are only writable through app.log_fan_activity()", async () => {
    await rejectsWith(withUser(A, (q) => q("insert into fan_activity (user_id, kind) values ($1, 'login')", [A])), "42501");
    await rejectsWith(withUser(A, (q) => q("insert into fan_room_items (user_id, item_id) values ($1, $2)", [A, id.itemPub])), "42501");

    await withUser(A, (q) => q("select app.log_fan_activity('login')"));
    await withUser(A, (q) => q("select app.log_fan_activity('login')")); // same day: idempotent
    expect(await n(A, "select 1 from fan_activity where user_id = $1 and kind = 'login'", [A])).toBe(1);
    expect(await n(A, "select 1 from fan_room_items where item_id = $1", [id.itemPub])).toBe(1);
    expect(await n(A, "select 1 from fan_room_items where item_id = $1", [id.itemDraft])).toBe(0); // draft items never unlock
    expect(await n(B, "select 1 from fan_room_items where user_id = $1", [A])).toBe(0);

    await rejectsWith(withUser(null, (q) => q("select app.log_fan_activity('login')")), "28000");

    // toggling a card must not farm the counter
    await withUser(C, (q) => q("select app.log_fan_activity('card', $1)", [id.pc1]));
    await withUser(C, (q) => q("select app.log_fan_activity('card', $1)", [id.pc1]));
    expect(await n(C, "select 1 from fan_activity where kind = 'card'")).toBe(1);

    // stream minutes cap at 600 per day
    await withUser(C, (q) => q("select app.log_fan_activity('stream_log', null, 600)"));
    await rejectsWith(withUser(C, (q) => q("select app.log_fan_activity('stream_log', null, 1)")), "H2H02");
  });

  it("6. only the allowed trade transitions succeed", async () => {
    // inserts: only as yourself, only pending
    await rejectsWith(withUser(A, (q) => q("insert into trade_requests (from_user, to_user, give_card_id, get_card_id) values ($1,$2,$3,$4)", [B, A, id.pc1, id.pc2])), "42501");
    await rejectsWith(withUser(A, (q) => q("insert into trade_requests (from_user, to_user, give_card_id, get_card_id, state) values ($1,$2,$3,$4,'accepted')", [A, B, id.pc1, id.pc2])), "42501");

    const t = await trade(A, B);
    expect(await n(C, "select 1 from trade_requests where id = $1", [t])).toBe(0);
    expect(await setTrade(C, t, "state = 'cancelled'")).toEqual([]); // outsider: row is invisible, nothing updated
    await rejectsWith(setTrade(A, t, "state = 'accepted'"), "42501"); // only the recipient accepts
    await rejectsWith(setTrade(B, t, "state = 'done'"), "23514"); // no skipping
    expect(await setTrade(B, t, "state = 'accepted'")).toEqual([{ state: "accepted" }]);
    await rejectsWith(setTrade(B, t, "state = 'shipped'"), "23514"); // tracking_no required
    await rejectsWith(setTrade(B, t, "tracking_no = 'TH1'"), "23514"); // tracking only while shipping
    expect(await setTrade(A, t, "state = 'shipped', tracking_no = $2", ["TH123"])).toEqual([{ state: "shipped" }]);
    await rejectsWith(setTrade(A, t, "state = 'done'"), "42501"); // the shipper cannot confirm delivery
    await rejectsWith(setTrade(A, t, "state = 'cancelled'"), "23514"); // no cancel once shipped
    expect(await setTrade(B, t, "state = 'done'")).toEqual([{ state: "done" }]);
    // ratings: once, by their own side, only when done
    expect(await setTrade(A, t, "rating_from = 5")).toEqual([{ state: "done" }]);
    await rejectsWith(setTrade(A, t, "rating_from = 4"), "23514");
    await rejectsWith(setTrade(A, t, "rating_to = 4"), "23514");
    expect(await setTrade(B, t, "rating_to = 3")).toEqual([{ state: "done" }]);
    await rejectsWith(setTrade(B, t, "state = 'cancelled'"), "23514"); // terminal

    const early = await trade(A, B);
    await rejectsWith(setTrade(A, early, "rating_from = 5"), "23514"); // not done yet
    expect(await setTrade(A, early, "state = 'cancelled'")).toEqual([{ state: "cancelled" }]); // sender may cancel while pending
    await rejectsWith(setTrade(B, early, "state = 'accepted'"), "23514");
  });

  it("fan profile: created on first visit, theme saved, private to its owner", async () => {
    const first = await getOrCreateFanMe(A);
    expect(first).toMatchObject({ nickname: `rls-${tag}`, themeMode: "era", biasMemberId: null, eraAlbumId: null });
    expect(first.joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await saveFanTheme(A, { mode: "bias", biasMemberId: id.member, eraAlbumId: id.album });
    expect(await getOrCreateFanMe(A)).toMatchObject({ themeMode: "bias", biasMemberId: id.member, eraAlbumId: id.album });
    // going back to era mode keeps the stored bias and era
    await saveFanTheme(A, { mode: "era", biasMemberId: null, eraAlbumId: null });
    expect(await getOrCreateFanMe(A)).toMatchObject({ themeMode: "era", biasMemberId: id.member, eraAlbumId: id.album });

    expect(await n(B, "select 1 from fan_profiles where user_id = $1", [A])).toBe(0);
    await rejectsWith(withUser(B, (q) => q("insert into fan_profiles (user_id, nickname) values ($1, 'x')", [A])), "42501");
    await rejectsWith(saveFanTheme(A, { mode: "bias", biasMemberId: randomUUID(), eraAlbumId: null }), "23503"); // unknown member
  });

  it("daily login: opening a fan page logs one login per day and unlocks the login items", async () => {
    await getOrCreateFanMe(C);
    await getOrCreateFanMe(C); // same Thai day: still one row
    expect(await n(C, "select 1 from fan_activity where kind = 'login'")).toBe(1);
    expect(await n(C, "select 1 from fan_room_items where item_id = $1", [id.itemPub])).toBe(1);
    expect(await n(B, "select 1 from fan_activity where kind = 'login' and user_id = $1", [C])).toBe(0);
  });

  it("7. a guest sees only published content and no private rows", async () => {
    expect(await n(null, "select 1 from countdowns where id = any($1)", [[id.cdPub, id.cdDraft]])).toBe(1);
    expect(await n(null, "select 1 from photocards where id = any($1)", [[id.pc1, id.pc2, id.pcDraft]])).toBe(2);
    expect(await n(null, "select 1 from room_items where id = any($1)", [[id.itemPub, id.itemDraft]])).toBe(1);
    expect(await n(null, "select 1 from live_rooms where id = $1", [id.room])).toBe(1);
    for (const table of ["fan_cards", "notice_jobs", "capsule_letters", "event_reminders", "wrapped_snapshots", "fan_activity", "fan_room_items", "trade_requests", "fan_profiles", "live_messages"]) {
      expect(await n(null, `select 1 from ${table}`), `guest reads ${table}`).toBe(0);
    }
    await rejectsWith(withUser(null, (q) => q("select app.cheer($1)", [id.room])), "28000");
  });

  it("hides moderated chat from fans and shows it to editors, who alone can hide", async () => {
    const mine = (user: string) => n(user, "select 1 from live_messages where room_id = $1 and body in ('visible', 'hidden')", [id.room]);
    expect(await mine(B)).toBe(1); // visible only
    expect(await mine(E)).toBe(2); // editor sees both
    expect(await withUser(B, (q) => q("update live_messages set is_hidden = true where id = $1 returning id", [id.msgVisible]))).toEqual([]);
    expect(await withUser(E, (q) => q("update live_messages set is_hidden = true where id = $1 returning id", [id.msgVisible]))).toHaveLength(1);
    expect(await mine(B)).toBe(0);
  });

  it("presence: guests heartbeat by anon_id, the online count sees everyone, rows stay private", async () => {
    const anon = `anon-${tag}`;
    await withUser(null, (q) => q("insert into live_presence (room_id, anon_id) values ($1, $2) on conflict (room_id, anon_id) where anon_id is not null do update set seen_at = now()", [id.room, anon]));
    await withUser(B, (q) => q("insert into live_presence (room_id, user_id) values ($1, $2) on conflict (room_id, user_id) where user_id is not null do update set seen_at = now()", [id.room, B]));
    const [{ online }] = await withUser(A, (q) => q<{ online: number }>("select app.online_count($1) as online", [id.room]));
    expect(online).toBeGreaterThanOrEqual(2);
    expect(await n(A, "select 1 from live_presence where room_id = $1", [id.room])).toBe(0); // own rows only
    // cheering a closed room is refused
    await owner.query("update live_rooms set closes_at = now() - interval '1 minute' where id = $1", [id.room]);
    await rejectsWith(withUser(A, (q) => q("select app.cheer($1)", [id.room])), "H2H03");
  });
});
