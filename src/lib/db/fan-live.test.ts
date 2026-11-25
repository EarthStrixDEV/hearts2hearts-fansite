// Integration tests for the waiting room data layer (phase 5), through the real withUser() as the non-owner role fan_app.
// Same environment contract as fan-rls.test.ts: a Neon BRANCH with 0010 applied (never production), via
//   FAN_TEST_OWNER_URL (owner, for fixtures) and FAN_TEST_APP_URL (fan_app). Without them the suite is SKIPPED (not a pass).
// Fixtures carry a random tag and are deleted in afterAll; nothing else in the database is touched.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cheer, getFeed, getLiveView, heartbeat, LiveError, logAttendance, postMessage, toLiveError } from "./fan-live";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;

const kind = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof LiveError ? e.kind : `other:${(e as { code?: string }).code ?? e}`));

describe("toLiveError", () => {
  it("maps the SQLSTATE codes of migration 0010", () => {
    const thrown = (code: string, slow?: number) => { try { toLiveError({ code }, slow); } catch (e) { return e as LiveError; } };
    expect(thrown("H2H01", 5)).toMatchObject({ kind: "slow_mode", slowModeSec: 5 });
    expect(thrown("H2H03")).toMatchObject({ kind: "closed" });
    expect(thrown("28000")).toMatchObject({ kind: "sign_in" });
    expect(thrown("42501")).toMatchObject({ kind: "not_allowed" });
    expect(thrown("23503")).toMatchObject({ kind: "not_found" });
  });
  it("rethrows anything else untouched", () => {
    const boom = new Error("boom");
    expect(() => toLiveError(boom)).toThrow(boom);
  });
});

describe.skipIf(!enabled)("waiting room data layer (fan_app)", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const tag = randomUUID().slice(0, 8);
  const [A, B, X] = [randomUUID(), randomUUID(), randomUUID()]; // A, B fans; X banned
  const cd = { main: randomUUID(), draft: randomUUID(), noRoom: randomUUID(), closed: randomUUID(), before: randomUUID(), past: randomUUID() };
  const room = { main: randomUUID(), closed: randomUUID(), before: randomUUID(), past: randomUUID() };

  beforeAll(async () => {
    await owner.connect();
    for (const [uid, banned] of [[A, false], [B, false], [X, true]] as const) {
      await owner.query(
        `insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
        [uid, `live-${tag}`, `live-${tag}-${uid.slice(0, 6)}@test.invalid`],
      );
      await owner.query("insert into profiles (id, display_name, role, is_banned) values ($1, $2, 'fan', $3)", [uid, uid === A ? `Alice ${tag}` : `live-${tag}`, banned]);
    }
    const countdown = (id: string, status: string, target: string) =>
      owner.query("insert into countdowns (id, title, kind, target_at, status) values ($1, $2, 'comeback', " + target + ", $3)", [id, `LIVE ${tag}`, status]);
    await countdown(cd.main, "published", "now() + interval '1 hour'");
    await countdown(cd.draft, "draft", "now() + interval '1 hour'");
    await countdown(cd.noRoom, "published", "now() + interval '1 hour'");
    await countdown(cd.closed, "published", "now() + interval '1 hour'");
    await countdown(cd.before, "published", "now() + interval '1 hour'");
    await countdown(cd.past, "published", "now() - interval '1 minute'");
    const mk = (id: string, c: string, opens: string, closes: string, slow: number) =>
      owner.query(`insert into live_rooms (id, countdown_id, opens_at, closes_at, slow_mode_sec) values ($1, $2, ${opens}, ${closes}, $3)`, [id, c, slow]);
    await mk(room.main, cd.main, "now() - interval '1 hour'", "now() + interval '2 hours'", 60);
    await mk(room.closed, cd.closed, "now() - interval '3 hours'", "now() - interval '1 hour'", 60);
    await mk(room.before, cd.before, "now() + interval '1 hour'", "now() + interval '3 hours'", 60);
    await mk(room.past, cd.past, "now() - interval '1 hour'", "now() + interval '2 hours'", 60);
  });

  afterAll(async () => {
    try {
      // users first (cascades presence, messages, activity), then countdowns (cascades rooms)
      await owner.query('delete from neon_auth."user" where id = any($1)', [[A, B, X]]);
      await owner.query("delete from countdowns where id = any($1)", [Object.values(cd)]);
    } finally {
      await owner.end();
    }
  });

  it("getLiveView: published countdown with its room; no room; draft and junk ids are not found", async () => {
    const v = await getLiveView(cd.main);
    expect(v?.countdown).toMatchObject({ id: cd.main, kind: "comeback" });
    expect(v?.room).toMatchObject({ id: room.main, slowModeSec: 60, cheers: 0, online: 0 });
    expect((await getLiveView(cd.noRoom))?.room).toBeNull();
    expect(await getLiveView(cd.draft)).toBeNull();
    expect(await getLiveView(randomUUID())).toBeNull();
    expect(await getLiveView("not-a-uuid")).toBeNull();
  });

  it("heartbeat: signed-in and guest presence both count, one row each, repeats do not double count", async () => {
    expect(await heartbeat(A, room.main, null)).toBe(1);
    expect(await heartbeat(A, room.main, null)).toBe(1);
    const anon = `anon-${randomUUID()}`;
    expect(await heartbeat(null, room.main, anon)).toBe(2);
    expect(await heartbeat(B, room.main, null)).toBe(3);
    const rows = await owner.query("select count(*)::int as n from live_presence where room_id = $1", [room.main]);
    expect(rows.rows[0].n).toBe(3);
    await expect(heartbeat(null, room.main, null)).rejects.toThrow();
  });

  it("online count: only rows seen in the last 45 s", async () => {
    await owner.query("update live_presence set seen_at = now() - interval '44 seconds' where room_id = $1 and user_id = $2", [room.main, B]);
    expect((await getFeed(A, room.main, null))?.online).toBe(3);
    await owner.query("update live_presence set seen_at = now() - interval '46 seconds' where room_id = $1 and user_id = $2", [room.main, B]);
    expect((await getFeed(A, room.main, null))?.online).toBe(2);
    await heartbeat(B, room.main, null); // back online
    expect((await getFeed(A, room.main, null))?.online).toBe(3);
  });

  it("heartbeat into a room that does not exist is not_found", async () => {
    expect(await kind(heartbeat(A, randomUUID(), null))).toBe("not_found");
  });

  it("chat: A posts, B reads it with A's display name; guests get counts only", async () => {
    const m = await postMessage(A, room.main, "hello room");
    expect(m).toMatchObject({ body: "hello room", name: `Alice ${tag}` });

    const forB = await getFeed(B, room.main, null);
    expect(forB?.canRead).toBe(true);
    expect(forB?.messages.map((x) => x.body)).toEqual(["hello room"]);
    expect(forB?.messages[0]).not.toHaveProperty("user_id");

    const guest = await getFeed(null, room.main, null);
    expect(guest).toMatchObject({ canRead: false, messages: [] });
    expect(guest?.online).toBeGreaterThan(0);
    expect(await getFeed(B, randomUUID(), null)).toBeNull();
  });

  it("feed cursor: `after` returns only newer messages, in order; hidden ones are dropped", async () => {
    const before = (await getFeed(B, room.main, null))!.messages.at(-1)!.id;
    const m2 = await postMessage(B, room.main, "second");
    const next = await getFeed(A, room.main, before);
    expect(next?.messages.map((x) => x.id)).toEqual([m2.id]);
    expect((await getFeed(A, room.main, m2.id))?.messages).toEqual([]);

    await owner.query("update live_messages set is_hidden = true where id = $1", [m2.id]);
    expect((await getFeed(A, room.main, before))?.messages).toEqual([]);
    expect((await getFeed(A, room.main, null))?.messages.map((x) => x.body)).toEqual(["hello room"]);
  });

  it("slow mode: a second message inside the window is refused with the room's slow_mode_sec", async () => {
    await expect(postMessage(A, room.main, "too soon")).rejects.toMatchObject({ kind: "slow_mode", slowModeSec: 60 });
  });

  it("chat is closed outside opens_at..closes_at and for banned fans", async () => {
    expect(await kind(postMessage(A, room.closed, "late"))).toBe("not_allowed");
    expect(await kind(postMessage(A, room.before, "early"))).toBe("not_allowed");
    expect(await kind(postMessage(X, room.main, "banned"))).toBe("not_allowed");
    expect(await kind(postMessage(A, randomUUID(), "nowhere"))).toBe("not_found");
  });

  it("cheer: counts up in an open room; closed room and banned fans are refused", async () => {
    expect(await cheer(A, room.main)).toBe(1);
    expect(await cheer(B, room.main)).toBe(2);
    expect((await getFeed(A, room.main, null))?.cheers).toBe(2);
    expect(await kind(cheer(A, room.closed))).toBe("closed");
    expect(await kind(cheer(A, room.before))).toBe("closed");
    expect(await kind(cheer(X, room.main))).toBe("not_allowed");
  });

  it("attendance: refused before the countdown ends or when the room is closed; logged once after", async () => {
    expect(await logAttendance(A, room.main)).toBe(false); // target is 1 h away
    expect(await logAttendance(A, room.closed)).toBe(false);
    const count = async () =>
      (await owner.query("select count(*)::int as n from fan_activity where user_id = $1 and kind = 'live_attend' and ref_id = $2", [A, cd.past])).rows[0].n;
    expect(await count()).toBe(0);
    expect(await logAttendance(A, room.past)).toBe(true);
    expect(await logAttendance(A, room.past)).toBe(true); // idempotent: same Thai day, same countdown
    expect(await count()).toBe(1);
    expect(await kind(logAttendance(X, room.past))).toBe("not_allowed");
  });
});
