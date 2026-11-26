// sealCapsule end to end: the real data layer on the dev Neon branch (skipped without FAN_TEST_*), the session and the
// Next-only helpers mocked.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextAnniversary } from "@/lib/fan/anniversary";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;

const { session, revalidatePath } = vi.hoisted(() => ({ session: { userId: null as string | null }, revalidatePath: vi.fn() }));
vi.mock("@/lib/db/fan-session", () => ({ getSessionUserId: async () => session.userId }));
vi.mock("@/lib/db/fan", () => ({ getFandom: async () => ({ name: "S2U", name_native: "", color: "#A8D8FF", debut_date: "2025-02-24" }) }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { sealCapsule } from "./actions";

const valid = { toKind: "group", paper: "blush", body: "hello future", fanbookOptIn: true };

describe("sealCapsule validation (no database needed)", () => {
  beforeEach(() => { session.userId = randomUUID(); });

  it("rejects an empty or blank body with the inline message", async () => {
    for (const body of ["", "   ", "\n\t "]) {
      expect(await sealCapsule({ ...valid, body })).toEqual({ ok: false, error: "Write a few words before sealing." });
    }
  });

  it("rejects a body over 1000 characters and unknown values", async () => {
    expect(await sealCapsule({ ...valid, body: "a".repeat(1001) })).toMatchObject({ ok: false, error: "Keep it to 1,000 characters." });
    expect((await sealCapsule({ ...valid, paper: "neon" })).ok).toBe(false);
    expect((await sealCapsule({ ...valid, toKind: "everyone" })).ok).toBe(false);
    expect((await sealCapsule({ ...valid, fanbookOptIn: "yes" })).ok).toBe(false);
    expect((await sealCapsule(null)).ok).toBe(false);
  });
});

describe.skipIf(!enabled)("sealCapsule against the dev branch", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const U = randomUUID();
  const tag = randomUUID().slice(0, 8);

  beforeAll(async () => {
    await owner.connect();
    await owner.query(`insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`, [U, `act-${tag}`, `act-${tag}@test.invalid`]);
    await owner.query("insert into profiles (id, display_name, role) values ($1, $2, 'fan')", [U, `act-${tag}`]);
  });
  afterAll(async () => {
    try { await owner.query("delete from neon_auth.\"user\" where id = $1", [U]); } finally { await owner.end(); }
  });
  beforeEach(() => { revalidatePath.mockClear(); });

  it("refuses a signed-out visitor", async () => {
    session.userId = null;
    expect(await sealCapsule(valid)).toEqual({ ok: false, error: "Sign in to seal a letter." });
  });

  it("seals until the next anniversary at 00:00 KST, chosen by the server, and refreshes the page", async () => {
    session.userId = U;
    const before = Date.now();
    // a client-supplied openAt is ignored
    const res = await sealCapsule({ ...valid, openAt: "2026-01-01T00:00:00.000Z", body: "hello\r\nfuture" });
    expect(res.ok).toBe(true);
    const expected = nextAnniversary("2025-02-24", before).openAt.toISOString();
    expect(res).toEqual({ ok: true, openAt: expected });
    expect(revalidatePath).toHaveBeenCalledWith("/fan/capsule");

    const rows = (await owner.query("select to_kind, paper, body, fanbook_opt_in, open_at from capsule_letters where user_id = $1", [U])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ to_kind: "group", paper: "blush", body: "hello\nfuture", fanbook_opt_in: true });
    expect(rows[0].open_at.toISOString()).toBe(expected);
  });

  it("drops the fan book opt-in for a letter to future me", async () => {
    session.userId = U;
    expect((await sealCapsule({ ...valid, toKind: "self", fanbookOptIn: true })).ok).toBe(true);
    const row = (await owner.query("select fanbook_opt_in from capsule_letters where user_id = $1 and to_kind = 'self'", [U])).rows[0];
    expect(row.fanbook_opt_in).toBe(false);
  });
});
