// Capsule data layer + cron queries against a real Neon BRANCH (never production), as in fan-rls.test.ts.
//   FAN_TEST_OWNER_URL  owner connection string of the dev branch   FAN_TEST_APP_URL  fan_app connection string of the same branch
// Without them the suite is skipped (reported as skipped, not passed). Fixtures are tagged by random uuids and removed in afterAll.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authorsToNotify, purgeOldPresence } from "./fan-capsule-cron";
import { countFanbookLetters, listMyLetters, sealLetter } from "./fan-capsule";
import { withUser } from "./fan-client";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
// the app code reads these two; point them at the test branch so a stray .env.local can never reach production
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;
if (OWNER_URL) process.env.DATABASE_URL = OWNER_URL;

const rejectsWith = (p: Promise<unknown>, code: string) => expect(p).rejects.toMatchObject({ code });
const FUTURE = new Date(Date.now() + 400 * 86_400_000);

describe.skipIf(!enabled)("capsule data layer (fan_app) and cron queries", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const [A, B] = [randomUUID(), randomUUID()];
  const tag = randomUUID().slice(0, 8);
  const ids = { countdown: randomUUID(), room: randomUUID() };

  const letterRow = async (id: string) => (await owner.query("select * from capsule_letters where id = $1", [id])).rows[0];

  beforeAll(async () => {
    await owner.connect();
    for (const uid of [A, B]) {
      await owner.query(
        `insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
        [uid, `cap-${tag}`, `cap-${tag}-${uid.slice(0, 6)}@test.invalid`],
      );
      await owner.query("insert into profiles (id, display_name, role) values ($1, $2, 'fan')", [uid, `cap-${tag}`]);
    }
    await owner.query("insert into countdowns (id, title, kind, target_at, status) values ($1, $2, 'release', now() + interval '1 day', 'draft')", [ids.countdown, `cap ${tag}`]);
    await owner.query("insert into live_rooms (id, countdown_id, opens_at, closes_at) values ($1, $2, now(), now() + interval '1 hour')", [ids.room, ids.countdown]);
  });

  afterAll(async () => {
    try {
      await owner.query("delete from neon_auth.\"user\" where id = any($1)", [[A, B]]); // cascades letters
      await owner.query("delete from countdowns where id = $1", [ids.countdown]); // cascades the room and its presence
    } finally {
      await owner.end();
    }
  });

  it("seals a letter without RETURNING, and the author cannot read it back before open_at", async () => {
    const id = await sealLetter(A, { toKind: "group", paper: "lilac", body: "see you in 2027", fanbookOptIn: true }, FUTURE);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const row = await letterRow(id);
    expect(row).toMatchObject({ user_id: A, to_kind: "group", paper: "lilac", body: "see you in 2027", fanbook_opt_in: true });
    expect(new Date(row.open_at).getTime()).toBe(FUTURE.getTime());

    // sealed: not selectable by its author, never editable or deletable
    expect(await withUser(A, (q) => q("select body from capsule_letters where id = $1", [id]))).toEqual([]);
    await rejectsWith(withUser(A, (q) => q("update capsule_letters set body = 'x' where id = $1", [id])), "42501");
    await rejectsWith(withUser(A, (q) => q("delete from capsule_letters where id = $1", [id])), "42501");
  });

  it("lists only metadata, newest first, and only the fan's own letters", async () => {
    const second = await sealLetter(A, { toKind: "self", paper: "lemon", body: "note to future me", fanbookOptIn: false }, FUTURE);
    const mine = await listMyLetters(A);
    expect(mine).toHaveLength(2);
    expect(mine[0]).toMatchObject({ id: second, toKind: "self", paper: "lemon" });
    expect(Object.keys(mine[0]).sort()).toEqual(["createdAt", "id", "openAt", "paper", "toKind"]);
    expect(Date.parse(mine[0].openAt)).toBe(FUTURE.getTime());
    expect(await listMyLetters(B)).toEqual([]);
  });

  it("refuses a letter that is already open, as someone else, or with bad values", async () => {
    await rejectsWith(sealLetter(A, { toKind: "self", paper: "sky", body: "late", fanbookOptIn: false }, new Date(Date.now() - 60_000)), "42501");
    await rejectsWith(sealLetter(A, { toKind: "self", paper: "sky", body: "", fanbookOptIn: false }, FUTURE), "23514");
    await rejectsWith(sealLetter(A, { toKind: "self", paper: "sky", body: "x".repeat(1001), fanbookOptIn: false }, FUTURE), "23514");
    await rejectsWith(
      withUser(B, (q) => q("insert into capsule_letters (user_id, to_kind, body, open_at) values ($1, 'self', 'spoof', $2)", [A, FUTURE.toISOString()])),
      "42501",
    );
    // exactly 1000 characters is fine
    await sealLetter(B, { toKind: "self", paper: "sky", body: "y".repeat(1000), fanbookOptIn: false }, FUTURE);
  });

  it("stores the fan book opt-in only for letters to the group", async () => {
    const group = await sealLetter(B, { toKind: "group", paper: "sky", body: "g", fanbookOptIn: true }, FUTURE);
    const self = await sealLetter(B, { toKind: "self", paper: "sky", body: "s", fanbookOptIn: true }, FUTURE);
    expect((await letterRow(group)).fanbook_opt_in).toBe(true);
    expect((await letterRow(self)).fanbook_opt_in).toBe(false);
  });

  it("counts opted-in group letters through the aggregate, without exposing rows", async () => {
    const before = await countFanbookLetters(A);
    await sealLetter(A, { toKind: "group", paper: "blush", body: "counted", fanbookOptIn: true }, FUTURE);
    await sealLetter(A, { toKind: "group", paper: "blush", body: "not opted in", fanbookOptIn: false }, FUTURE);
    await sealLetter(A, { toKind: "self", paper: "blush", body: "not to the group", fanbookOptIn: true }, FUTURE);
    expect(await countFanbookLetters(A)).toBe(before + 1);
    expect(await countFanbookLetters(B)).toBe(before + 1);
    // the same number is visible to a guest, who still cannot read a single row
    expect(await countFanbookLetters(null)).toBe(before + 1);
    expect(await withUser(B, (q) => q("select 1 from capsule_letters where user_id = $1", [A]))).toEqual([]);
  });

  it("cron: finds authors whose letters opened within the last hour, once per author", async () => {
    const insertOpen = (user: string, minutesAgo: number) =>
      owner.query("insert into capsule_letters (user_id, to_kind, body, open_at) values ($1, 'self', 'opened', now() - make_interval(mins => $2::int))", [user, minutesAgo]);
    await insertOpen(A, 20);
    await insertOpen(A, 45);
    await insertOpen(B, 59);
    await insertOpen(B, 150); // outside the window
    await owner.query("insert into capsule_letters (user_id, to_kind, body, open_at) values ($1, 'self', 'still sealed', now() + interval '10 minutes')", [B]);

    const mine = (await authorsToNotify(60)).filter((r) => r.userId === A || r.userId === B);
    expect(mine).toEqual([A, B].sort().map((userId) => ({ userId, letters: userId === A ? 2 : 1 })));
    // a wider window picks up the 150-minute-old one too
    expect((await authorsToNotify(180)).find((r) => r.userId === B)?.letters).toBe(2);
  });

  it("cron: deletes presence rows older than a day and keeps fresh ones", async () => {
    await owner.query("insert into live_presence (room_id, anon_id, seen_at) values ($1, $2, now() - interval '2 days')", [ids.room, `old-${tag}`]);
    await owner.query("insert into live_presence (room_id, anon_id, seen_at) values ($1, $2, now() - interval '23 hours')", [ids.room, `recent-${tag}`]);
    await owner.query("insert into live_presence (room_id, anon_id) values ($1, $2)", [ids.room, `now-${tag}`]);

    expect(await purgeOldPresence(ids.room)).toBe(1);
    const left = (await owner.query("select anon_id from live_presence where room_id = $1 order by anon_id", [ids.room])).rows.map((r) => r.anon_id);
    expect(left).toEqual([`now-${tag}`, `recent-${tag}`]);
    expect(await purgeOldPresence(ids.room)).toBe(0); // safe to rerun
  });
});
