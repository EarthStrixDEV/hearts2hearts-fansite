import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

// Auth and input checks only: a valid call would aggregate every fan on whatever database DATABASE_URL points at.
const call = (headers: Record<string, string> = {}, qs = "") => GET(new Request(`http://localhost/api/cron/build-wrapped${qs}`, { headers }));
const saved = process.env.CRON_SECRET;
afterEach(() => { if (saved === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = saved; });

describe("GET /api/cron/build-wrapped", () => {
  it("answers 500 when CRON_SECRET is not configured, even for a request with a header", async () => {
    delete process.env.CRON_SECRET;
    expect((await call({ authorization: "Bearer anything" })).status).toBe(500);
  });

  it("rejects a missing or wrong bearer token with 401", async () => {
    process.env.CRON_SECRET = "s3cret-for-test";
    expect((await call()).status).toBe(401);
    expect((await call({ authorization: "Bearer nope" })).status).toBe(401);
    expect((await call({ authorization: "s3cret-for-test" })).status).toBe(401);
  });

  it("with the right token, rejects a bad year before touching the database", async () => {
    process.env.CRON_SECRET = "s3cret-for-test";
    const h = { authorization: "Bearer s3cret-for-test" };
    for (const qs of ["?year=abc", "?year=1999", "?year=2101", "?year=2026.5"]) expect((await call(h, qs)).status, qs).toBe(400);
  });
});
