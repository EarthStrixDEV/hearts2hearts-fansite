import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authorsToNotify, purgeOldPresence } = vi.hoisted(() => ({ authorsToNotify: vi.fn(), purgeOldPresence: vi.fn() }));
vi.mock("@/lib/db/fan-capsule-cron", () => ({ authorsToNotify, purgeOldPresence }));

import { GET } from "./route";

const call = (auth?: string) => GET(new Request("http://localhost/api/cron/unlock-capsules", { headers: auth ? { authorization: auth } : {} }));

describe("GET /api/cron/unlock-capsules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-02-23T15:00:05Z")); // not midnight UTC
    authorsToNotify.mockReset().mockResolvedValue([{ userId: "u1", letters: 2 }, { userId: "u2", letters: 1 }]);
    purgeOldPresence.mockReset().mockResolvedValue(7);
    vi.stubEnv("CRON_SECRET", "s3cret");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("answers 500 when CRON_SECRET is not configured, without touching the database", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer s3cret")).status).toBe(500);
    expect(authorsToNotify).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong bearer token", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call("s3cret")).status).toBe(401);
    expect(authorsToNotify).not.toHaveBeenCalled();
    expect(purgeOldPresence).not.toHaveBeenCalled();
  });

  it("reports who just unlocked and leaves presence alone outside 00:00 UTC", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ windowMinutes: 60, authors: 2, letters: 3, notified: 0, presencePurged: null });
    expect(authorsToNotify).toHaveBeenCalledWith(60);
    expect(purgeOldPresence).not.toHaveBeenCalled();
  });

  it("also purges old presence rows at 00:00 UTC", async () => {
    vi.setSystemTime(new Date("2027-02-24T00:00:03Z"));
    const body = await (await call("Bearer s3cret")).json();
    expect(body.presencePurged).toBe(7);
    expect(purgeOldPresence).toHaveBeenCalledTimes(1);
  });

  it("answers 500 without leaking details when the query fails", async () => {
    authorsToNotify.mockRejectedValue(new Error("db down: postgres://secret"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
