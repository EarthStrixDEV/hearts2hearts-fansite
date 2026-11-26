// "My room" data layer against the real dev branch, through withUser() as the non-owner role fan_app (same env as fan-rls.test.ts:
// FAN_TEST_OWNER_URL + FAN_TEST_APP_URL, never production). Skipped without them. Fixtures are tagged and removed in afterAll.
// log_fan_activity() unlocks EVERY published item whose rule is met, so assertions only look at this file's own fixture items.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./fan-client";
import { getMyRoom, setItemPlaced } from "./fan-room";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;

describe.skipIf(!enabled)("fan room data (fan_app)", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const [A, B, C] = [randomUUID(), randomUUID(), randomUUID()];
  const tag = randomUUID().slice(0, 8);
  const item = { login: randomUUID(), mission: randomUUID(), draft: randomUUID() };
  const spot = { x: 1.5, y: 0, z: -1, rot: 45 };

  const find = async (user: string, id: string) => (await getMyRoom(user)).items.find((i) => i.id === id);
  const log = (user: string, kind: string, ref: string | null = null, amount = 1) =>
    withUser(user, (q) => q("select app.log_fan_activity($1, $2, $3)", [kind, ref, amount]));

  beforeAll(async () => {
    await owner.connect();
    for (const uid of [A, B, C]) {
      await owner.query(
        `insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
        [uid, `room-${tag}`, `room-${tag}-${uid.slice(0, 6)}@test.invalid`],
      );
      await owner.query("insert into profiles (id, display_name, role) values ($1, $2, 'fan')", [uid, `room-${tag}`]);
    }
    const rows: [string, string, string, string][] = [
      [item.login, "login", '{"kind":"login","count":1}', "published"],
      [item.mission, "mission", '{"kind":"mission","count":"2"}', "published"], // numeric-string count is allowed by the table check
      [item.draft, "draft", '{"kind":"login","count":1}', "draft"],
    ];
    for (const [id, name, rule, status] of rows) {
      await owner.query("insert into room_items (id, slug, name, unlock_rule, status) values ($1, $2, $3, $4::jsonb, $5)", [id, `room-${name}-${tag}`, `Room ${name} ${tag}`, rule, status]);
    }
  });

  afterAll(async () => {
    try {
      await owner.query('delete from neon_auth."user" where id = any($1)', [[A, B, C]]); // cascades fan_activity / fan_room_items / fan_profiles
      await owner.query("delete from room_items where id = any($1)", [[item.login, item.mission, item.draft]]);
    } finally {
      await owner.end();
    }
  });

  it("opening the room counts as the day's login; other items stay locked; drafts are never shown", async () => {
    const room = await getMyRoom(A);
    // the page load logs the daily login (getOrCreateFanMe), which unlocks the login item right away
    expect(room.items.find((i) => i.id === item.login)).toMatchObject({ unlocked: true, placed: false, placement: null, modelUrl: null });
    expect(room.items.find((i) => i.id === item.mission)).toMatchObject({ unlocked: false, rule: { kind: "mission", count: 2 } });
    expect(room.items.find((i) => i.id === item.draft)).toBeUndefined();
    expect(room.totals.login).toBe(1);
    expect(room.nickname).toBeTruthy();
  });

  it("unlocks through log_fan_activity and keeps the other item locked, with the activity totals", async () => {
    await log(A, "login");
    const room = await getMyRoom(A);
    expect(room.items.find((i) => i.id === item.login)?.unlocked).toBe(true);
    expect(room.items.find((i) => i.id === item.mission)?.unlocked).toBe(false);
    expect(room.totals.login).toBe(1);

    await log(A, "mission", randomUUID());
    expect((await find(A, item.mission))?.unlocked).toBe(false); // 1 of 2
    await log(A, "mission", randomUUID());
    expect((await find(A, item.mission))?.unlocked).toBe(true);
    expect((await getMyRoom(A)).totals.mission).toBe(2);
  });

  it("lists unlocked items before locked ones", async () => {
    const items = (await getMyRoom(A)).items;
    const firstLocked = items.findIndex((i) => !i.unlocked);
    if (firstLocked >= 0) expect(items.slice(firstLocked).every((i) => !i.unlocked)).toBe(true);
  });

  it("places an item, then removes it keeping the stored placement", async () => {
    expect(await setItemPlaced(A, item.login, true, spot)).toBe(true);
    expect(await find(A, item.login)).toMatchObject({ placed: true, placement: spot });

    expect(await setItemPlaced(A, item.login, false, null)).toBe(true);
    expect(await find(A, item.login)).toMatchObject({ placed: false, placement: spot });
  });

  it("cannot place a locked item (no unlocked row to update)", async () => {
    expect(await setItemPlaced(C, item.login, true, spot)).toBe(false);
    expect((await find(C, item.login))?.placed).toBe(false);
  });

  it("only touches the caller's own row", async () => {
    await setItemPlaced(A, item.login, true, spot);
    await log(B, "login");
    expect(await setItemPlaced(B, item.login, true, { ...spot, x: -1 })).toBe(true);
    expect((await find(A, item.login))?.placement).toEqual(spot);
    expect((await find(B, item.login))?.placement).toMatchObject({ x: -1 });
  });

  it("does not let fan_app write unlocks or other columns directly", async () => {
    await expect(withUser(C, (q) => q("insert into fan_room_items (user_id, item_id) values ($1, $2)", [C, item.login]))).rejects.toMatchObject({ code: "42501" });
    await expect(withUser(A, (q) => q("update fan_room_items set unlocked_at = now() where user_id = $1", [A]))).rejects.toMatchObject({ code: "42501" });
  });

  it("ignores a stored placement that is no longer valid instead of failing the page", async () => {
    await owner.query("update fan_room_items set placed = true, placement = '{\"x\":99}'::jsonb where user_id = $1 and item_id = $2", [A, item.login]);
    expect(await find(A, item.login)).toMatchObject({ placed: true, placement: null });
  });
});
