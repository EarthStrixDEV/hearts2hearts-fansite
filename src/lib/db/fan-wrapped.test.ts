// Integration tests for phase 7 (activity log + Fan Wrapped) against the dev Neon branch. Same env contract as fan-rls.test.ts:
//   FAN_TEST_OWNER_URL / FAN_TEST_APP_URL (never the app's DATABASE_URL*, so a stray .env.local cannot point these at prod).
// Without them the suite is SKIPPED (not passed). Wrapped fixtures live in the year 2031 so real data and other sessions' rows
// cannot change the ranks; every row is tagged and removed in afterAll (users cascade).
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWrapped, upsertSnapshots, wrappedKey, type WrappedStore } from "@/lib/fan/wrapped-build";
import { buildSlides } from "@/lib/fan/wrapped";
import { withUser } from "./fan-client";
import { getWrappedSnapshot, logFanActivity } from "./fan-wrapped";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;
if (OWNER_URL) process.env.DATABASE_URL = OWNER_URL;

const YEAR = 2031;

describe.skipIf(!enabled)("fan wrapped + activity log (dev branch)", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const [A, B, C, X] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const id = { album: randomUUID(), member: randomUUID(), pc1: randomUUID(), pc2: randomUUID() };
  const tag = randomUUID().slice(0, 8);
  const all = [A, B, C, X];

  const put: string[] = [];
  const store: WrappedStore = { put: async (key, png) => { put.push(key); if (png[0] !== 0x89) throw new Error("not a png"); } };
  const act = (u: string, kind: string, at: string, amount = 1) =>
    owner.query("insert into fan_activity (user_id, kind, amount, created_at) values ($1, $2, $3, $4)", [u, kind, amount, at]);
  const snapshotRows = async () => (await owner.query("select user_id from wrapped_snapshots where year = $1 and user_id = any($2)", [YEAR, all])).rowCount;

  beforeAll(async () => {
    await owner.connect();
    for (const [uid, banned] of [[A, false], [B, false], [C, false], [X, true]] as const) {
      await owner.query(`insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`, [uid, `wr-${tag}`, `wr-${tag}-${uid.slice(0, 6)}@test.invalid`]);
      await owner.query("insert into profiles (id, display_name, role, is_banned) values ($1, $2, 'fan', $3)", [uid, `wr-${tag}-${uid.slice(0, 4)}`, banned]);
    }
    await owner.query("insert into albums (id, slug, title, album_type, status) values ($1, $2, $3, 'single', 'published')", [id.album, `wr-${tag}`, `WR ${tag}`]);
    await owner.query("insert into members (id, slug, stage_name, color_hex, status) values ($1, $2, $3, '#FF8FB8', 'published')", [id.member, `wr-${tag}`, `Wr${tag}`]);
    for (const [pid, v] of [[id.pc1, "A"], [id.pc2, "B"]]) {
      await owner.query("insert into photocards (id, album_id, member_id, version, status) values ($1,$2,$3,$4,'published')", [pid, id.album, id.member, v]);
    }
    await owner.query("insert into fan_profiles (user_id, nickname, bias_member_id) values ($1, $2, $3)", [A, `Mina-${tag}`, id.member]);
    await owner.query("insert into fan_cards (user_id, photocard_id, state) values ($1, $2, 'have'), ($1, $3, 'want')", [A, id.pc1, id.pc2]);

    // A: rows at the Thai-year edges. 2030-12-31 17:30Z is Jan 1 00:30 in Bangkok (inside 2031); 2031-12-31 17:30Z is Jan 1 2032 (outside).
    await act(A, "login", "2030-12-31T17:30:00Z");
    await act(A, "login", "2031-03-01T10:00:00Z");
    await act(A, "mission", "2031-03-01T12:00:00Z");   // same Thai day as the login above
    await act(A, "login", "2031-03-02T10:00:00Z");
    await act(A, "live_attend", "2031-04-01T10:00:00Z");
    await act(A, "card", "2031-06-01T10:00:00Z");
    await act(A, "stream_log", "2031-05-01T10:00:00Z", 120);   // never counted
    await act(A, "login", "2031-12-31T17:30:00Z");              // next Thai year
    await act(B, "login", "2031-03-01T10:00:00Z");
    await act(B, "login", "2031-03-05T10:00:00Z");
    await act(C, "login", "2031-03-01T10:00:00Z");
    for (let d = 1; d <= 5; d++) await act(X, "login", `2031-04-0${d}T10:00:00Z`);   // banned: not ranked
  });

  afterAll(async () => {
    try {
      await owner.query(`delete from neon_auth."user" where id = any($1)`, [all]);   // cascades activity, cards, snapshots
      await owner.query("delete from media where path like any($1)", [all.map((u) => `wrapped/${YEAR}/${u}/%`)]);
      await owner.query("delete from albums where id = $1", [id.album]);
      await owner.query("delete from members where id = $1", [id.member]);
    } finally {
      await owner.end();
    }
  });

  it("aggregates the Thai calendar year per fan: counts, active days, rank, binder and bias", async () => {
    const r = await buildWrapped(YEAR, { only: all, store });
    expect(r).toMatchObject({ year: YEAR, upserted: 3, rendered: 3, failed: 0, remaining: 0, imagesSkipped: false });

    const a = (await getWrappedSnapshot(A, YEAR))!;
    expect(a).toMatchObject({
      v: 1, year: YEAR, nickname: `Mina-${tag}`, score: 6, rank: 1, fans: 3, logins: 3, missions: 1, liveAttended: 1, activeDays: 5,
      bias: { id: id.member, name: `Wr${tag}`, color: "#FF8FB8", have: 1 }, fandom: { fans: 3, actions: 9 },
    });
    const [{ n }] = (await owner.query("select count(*)::int as n from photocards where status = 'published'")).rows;
    expect(a.binder).toEqual({ have: 1, want: 1, total: n });

    const b = (await getWrappedSnapshot(B, YEAR))!;
    expect(b).toMatchObject({ score: 2, rank: 2, bias: null, binder: { have: 0, want: 0 } });
    expect(b.nickname).toBe(`wr-${tag}-${B.slice(0, 4)}`);   // no fan profile: falls back to the account display name
    expect((await getWrappedSnapshot(C, YEAR))!).toMatchObject({ score: 1, rank: 3 });
  });

  it("leaves a banned fan out, and builds slides only from real data (no stream or top-track card)", async () => {
    expect(await owner.query("select 1 from wrapped_snapshots where user_id = $1", [X])).toHaveProperty("rowCount", 0);
    const a = (await getWrappedSnapshot(A, YEAR))!;
    // 3 fans < MIN_FANS_FOR_RANK: no rank slide yet
    expect(buildSlides(a).map((s) => s.id)).toEqual(["intro", "days", "binder", "bias"]);
  });

  it("stores one 1080x1920 PNG per slide under a deterministic key, with a media row for the cover", async () => {
    const a = (await getWrappedSnapshot(A, YEAR))!;
    const slides = buildSlides(a);
    expect(a.images).toEqual(slides.map((_, i) => wrappedKey(YEAR, A, i)));
    expect(put).toEqual(expect.arrayContaining(a.images));
    const [row] = (await owner.query(
      "select m.path, m.mime_type, m.width, m.height from wrapped_snapshots w join media m on m.id = w.image_id where w.user_id = $1 and w.year = $2", [A, YEAR],
    )).rows;
    expect(row).toEqual({ path: wrappedKey(YEAR, A, 0), mime_type: "image/png", width: 1080, height: 1920 });
  });

  it("is safe to rerun: no duplicates, finished images are kept, only changed fans are rendered again", async () => {
    const before = put.length;
    const again = await buildWrapped(YEAR, { only: all, store });
    expect(again).toMatchObject({ upserted: 3, rendered: 0, remaining: 0 });
    expect(put.length).toBe(before);
    expect(await snapshotRows()).toBe(3);
    expect((await getWrappedSnapshot(A, YEAR))!.images.length).toBeGreaterThan(0);

    await act(B, "mission", "2031-07-01T10:00:00Z");   // B's numbers change
    const third = await buildWrapped(YEAR, { only: all, store });
    expect(third).toMatchObject({ upserted: 3, rendered: 1, remaining: 0 });
    expect(put.slice(before).every((k) => k.includes(`/${B}/`))).toBe(true);
    expect(await snapshotRows()).toBe(3);
    expect((await getWrappedSnapshot(B, YEAR))!).toMatchObject({ score: 3, missions: 1 });
  });

  it("stops rendering at the time budget and the next run finishes the rest", async () => {
    await owner.query("update wrapped_snapshots set data = data || '{\"images\": []}' where year = $1 and user_id = any($2)", [YEAR, all]);
    let t = 0;
    const clock = () => (t += 1000);   // every check advances 1 s
    const part = await buildWrapped(YEAR, { only: all, store, budgetMs: 2500, now: clock });
    expect(part.rendered).toBeGreaterThan(0);
    expect(part.rendered).toBeLessThan(3);
    expect(part.remaining).toBe(3 - part.rendered);
    const rest = await buildWrapped(YEAR, { only: all, store });
    expect(rest).toMatchObject({ rendered: 3 - part.rendered, remaining: 0 });
  });

  it("without storage it still writes the snapshots and says images were skipped", async () => {
    await owner.query("delete from wrapped_snapshots where year = $1 and user_id = any($2)", [YEAR, all]);
    const r = await buildWrapped(YEAR, { only: all, store: null });
    expect(r).toMatchObject({ upserted: 3, rendered: 0, remaining: 3, imagesSkipped: true });
  });

  it("a fan reads only their own snapshot (RLS); another fan and a missing year get null", async () => {
    expect(await getWrappedSnapshot(A, YEAR)).not.toBeNull();
    expect(await withUser(B, (q) => q("select 1 from wrapped_snapshots where user_id = $1", [A]))).toEqual([]);
    expect(await getWrappedSnapshot(A, 2030)).toBeNull();
    // a bad row never crashes the page
    await owner.query("update wrapped_snapshots set data = '{}' where user_id = $1 and year = $2", [C, YEAR]);
    expect(await getWrappedSnapshot(C, YEAR)).toBeNull();
  });

  it("upsertSnapshots rejects nothing for an empty filter and writes nothing for it", async () => {
    expect(await upsertSnapshots(YEAR, [])).toBe(0);
  });

  describe("logFanActivity (app.log_fan_activity)", () => {
    const n = async (u: string, kind: string) => (await owner.query("select count(*)::int as n from fan_activity where user_id = $1 and kind = $2 and created_at >= now() - interval '1 hour'", [u, kind])).rows[0].n as number;

    it("login is idempotent per day; live_attend per day and ref", async () => {
      await logFanActivity(C, { kind: "login" });
      await logFanActivity(C, { kind: "login" });
      expect(await n(C, "login")).toBe(1);
      const room = randomUUID();
      await logFanActivity(C, { kind: "live_attend", refId: room });
      await logFanActivity(C, { kind: "live_attend", refId: room });
      expect(await n(C, "live_attend")).toBe(1);
    });

    it("a card counts once per card, ever", async () => {
      await logFanActivity(C, { kind: "card", refId: id.pc1 });
      await logFanActivity(C, { kind: "card", refId: id.pc1 });
      await logFanActivity(C, { kind: "card", refId: id.pc2 });
      expect(await n(C, "card")).toBe(2);
    });

    it("stream_log is capped at 600 minutes per Thai day (H2H02)", async () => {
      await logFanActivity(B, { kind: "stream_log", amount: 600 });
      await expect(logFanActivity(B, { kind: "stream_log", amount: 1 })).rejects.toMatchObject({ code: "H2H02" });
    });

    it("a banned fan cannot log (42501), and bad input never reaches SQL", async () => {
      await expect(logFanActivity(X, { kind: "login" })).rejects.toMatchObject({ code: "42501" });
      await expect(logFanActivity(A, { kind: "nope" as never })).rejects.toThrow();
      await expect(logFanActivity(A, { kind: "mission", amount: 0 })).rejects.toThrow();
      await expect(logFanActivity(A, { kind: "mission", amount: 601 })).rejects.toThrow();
      await expect(logFanActivity(A, { kind: "mission", refId: "not-a-uuid" })).rejects.toThrow();
    });

    it("a fan cannot insert into fan_activity directly", async () => {
      await expect(withUser(A, (q) => q("insert into fan_activity (user_id, kind) values ($1, 'mission')", [A]))).rejects.toMatchObject({ code: "42501" });
    });
  });
});
