// Integration tests for the AI notice reader data layer, against a Neon BRANCH with 0010 applied (never production).
// Same switches as fan-rls.test.ts: FAN_TEST_OWNER_URL (owner) + FAN_TEST_APP_URL (fan_app). Without them the suite is SKIPPED.
// Fixtures are tagged, owned by throw-away users, and removed in afterAll.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./fan-client";
import {
  claimForReading, createJob, failJob, finishJob, getJob, getLatestJob, getReminderKinds, jobsToday, RateLimitError, sendToSchedule, setReminders,
} from "./fan-notice";
import { DAILY_JOB_LIMIT } from "@/lib/fan/notice";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
// the data layer's owner-client calls (state changes, events) must hit the test branch too, never a stray DATABASE_URL
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;
if (OWNER_URL) process.env.DATABASE_URL = OWNER_URL;

const rejectsWith = (p: Promise<unknown>, code: string) => expect(p).rejects.toMatchObject({ code });

describe.skipIf(!enabled)("notice reader data layer", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const [A, B, E, R] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()]; // fan, other fan, editor, rate-limit fan
  const tag = randomUUID().slice(0, 8);
  const img = (n: string) => ({ path: `notices/test-${tag}-${n}.png`, mime: "image/png" });
  const future = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
  const items = (startsAt: string | null = future(180)) => [
    { title_ko: "음악방송", title_th: `เวที ${tag}`, starts_at: startsAt, confidence: 0.9 },
    { title_ko: "라이브", title_th: `ไลฟ์ ${tag}`, starts_at: null, confidence: 0.4 },
  ];

  beforeAll(async () => {
    await owner.connect();
    for (const [uid, role] of [[A, "fan"], [B, "fan"], [E, "editor"], [R, "fan"]] as const) {
      await owner.query(
        `insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
        [uid, `notice-${tag}`, `notice-${tag}-${uid.slice(0, 6)}@test.invalid`],
      );
      await owner.query("insert into profiles (id, display_name, role) values ($1, $2, $3)", [uid, `notice-${tag}`, role]);
    }
  });

  afterAll(async () => {
    try {
      const users = [A, B, E, R];
      const ev = await owner.query<{ id: string }>("select id from events where title like $1", [`%${tag}%`]);
      await owner.query("delete from events where title like $1", [`%${tag}%`]);
      await owner.query("delete from activity_log where entity = 'events' and entity_id = any($1)", [ev.rows.map((r) => r.id)]);
      await owner.query("delete from notice_jobs where user_id = any($1)", [users]); // cascades event_reminders
      await owner.query("delete from media where path like $1", [`notices/test-${tag}-%`]);
      await owner.query('delete from neon_auth."user" where id = any($1)', [users]);
    } finally {
      await owner.end();
    }
  });

  it("createJob stores a media row and a queued job owned by the user", async () => {
    const { id } = await createJob(A, img("a1"));
    const job = await getJob(A, id);
    expect(job).toMatchObject({ id, state: "queued", items: null, error: null, model: null, imagePath: `notices/test-${tag}-a1.png` });
    expect(await jobsToday(A)).toBe(1);
    expect((await getLatestJob(A))?.id).toBe(id);
    const media = await owner.query("select mime_type, uploaded_by from media where path = $1", [img("a1").path]);
    expect(media.rows[0]).toEqual({ mime_type: "image/png", uploaded_by: A });
  });

  it("a job is private to its owner", async () => {
    const { id } = await createJob(A, img("a2"));
    expect(await getJob(B, id)).toBeNull();
    expect(await getJob(A, "not-a-uuid")).toBeNull();
    expect(await getLatestJob(B)).toBeNull();
    expect(await claimForReading(id, B, "m")).toBe(false); // the owner client still checks the user
    expect((await getJob(A, id))?.state).toBe("queued");
  });

  it("fan_app can insert notice_jobs but cannot change their state itself", async () => {
    const { id } = await createJob(A, img("a3"));
    await rejectsWith(withUser(A, (q) => q("update notice_jobs set state = 'done' where id = $1", [id])), "42501");
    // nor insert a job for someone else
    const [{ id: media }] = await owner.query<{ id: string }>("select id from media where path = $1", [img("a3").path]).then((r) => r.rows);
    await rejectsWith(withUser(A, (q) => q("insert into notice_jobs (user_id, image_id) values ($1, $2)", [B, media])), "42501");
  });

  it("walks queued -> reading -> done; a second claim and a claim on a done job are refused", async () => {
    const { id } = await createJob(A, img("a4"));
    expect(await claimForReading(id, A, "test-model")).toBe(true);
    expect(await claimForReading(id, A, "test-model")).toBe(false); // already reading: no second LLM call
    expect(await getJob(A, id)).toMatchObject({ state: "reading", model: "test-model", items: null });

    await finishJob(id, items("2026-12-05T08:00:00.000Z"));
    const done = await getJob(A, id);
    expect(done?.state).toBe("done");
    expect(done?.items).toEqual(items("2026-12-05T08:00:00.000Z"));
    expect(await claimForReading(id, A, "test-model")).toBe(false);
    await failJob(id, "late failure"); // only a `reading` job can fail: a done job stays done
    expect((await getJob(A, id))?.state).toBe("done");
  });

  it("a failed job keeps a short error and can be claimed again", async () => {
    const { id } = await createJob(A, img("a5"));
    await claimForReading(id, A, "m");
    await failJob(id, "x".repeat(1000));
    const failed = await getJob(A, id);
    expect(failed?.state).toBe("failed");
    expect(failed?.error).toHaveLength(300);
    expect(await claimForReading(id, A, "m")).toBe(true);
    expect((await getJob(A, id))?.error).toBeNull();
  });

  it("stored JSON that no longer matches the schema reads back as no items, not a crash", async () => {
    const { id } = await createJob(A, img("a6"));
    await owner.query("update notice_jobs set state = 'done', result = '{\"oops\":1}' where id = $1", [id]);
    expect(await getJob(A, id)).toMatchObject({ state: "done", items: null });
  });

  it("limits a user to 10 jobs per day in SQL, even when the uploads race", async () => {
    const results = await Promise.allSettled(Array.from({ length: DAILY_JOB_LIMIT + 4 }, (_, i) => createJob(R, img(`r${i}`))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(DAILY_JOB_LIMIT);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(4);
    expect(rejected.every((r) => r.reason instanceof RateLimitError)).toBe(true);
    expect(await jobsToday(R)).toBe(DAILY_JOB_LIMIT);
    // nothing leaked: the refused uploads left no media rows behind (the transaction rolled back)
    const m = await owner.query("select count(*)::int as n from media where path like $1", [`notices/test-${tag}-r%`]);
    expect(m.rows[0].n).toBe(DAILY_JOB_LIMIT);
    // another user is not affected
    await createJob(B, img("b1"));
  });

  it("the daily window follows the Thai calendar day", async () => {
    // a job created 2 days ago does not count today
    const [{ id: media }] = await owner.query<{ id: string }>("insert into media (path, mime_type) values ($1, 'image/png') returning id", [img("old").path]).then((r) => r.rows);
    await owner.query("insert into notice_jobs (user_id, image_id, created_at) values ($1, $2, now() - interval '2 days')", [B, media]);
    expect(await jobsToday(B)).toBe(1); // only b1 from the previous test
  });

  describe("reminders", () => {
    it("saves one row per future timed event, skips items without a time, and is idempotent", async () => {
      const { id } = await createJob(A, img("rem1"));
      await claimForReading(id, A, "m");
      await finishJob(id, items(future(180)));

      expect(await setReminders(A, id, "1h", true)).toBe(1); // item 1 has no time
      expect(await setReminders(A, id, "1h", true)).toBe(1); // again: still one row
      expect(await setReminders(A, id, "15m", true)).toBe(1);
      expect(await getReminderKinds(A, id)).toEqual(["15m", "1h"]);
      const rows = await owner.query("select item_index, kind, remind_at from event_reminders where job_id = $1 order by kind", [id]);
      expect(rows.rows.map((r) => [r.item_index, r.kind])).toEqual([[0, "15m"], [0, "1h"]]);

      expect(await setReminders(A, id, "1h", false)).toBe(0);
      expect(await getReminderKinds(A, id)).toEqual(["15m"]);
    });

    it("skips moments that already passed", async () => {
      const { id } = await createJob(A, img("rem2"));
      await claimForReading(id, A, "m");
      await finishJob(id, items(future(30))); // starts in 30 min: the 1 h reminder is gone, 15 min is not
      expect(await setReminders(A, id, "1h", true)).toBe(0);
      expect(await setReminders(A, id, "15m", true)).toBe(1);
    });

    it("refuses another fan's job and unfinished jobs", async () => {
      const { id } = await createJob(A, img("rem3"));
      expect(await setReminders(A, id, "1h", true)).toBeNull(); // still queued
      await claimForReading(id, A, "m");
      await finishJob(id, items());
      expect(await setReminders(B, id, "1h", true)).toBeNull();
      expect(await setReminders(A, "nope", "1h", true)).toBeNull();
      expect(await owner.query("select 1 from event_reminders where job_id = $1", [id]).then((r) => r.rowCount)).toBe(0);
    });
  });

  describe("send to /schedule", () => {
    it("inserts a draft per timed item, skips items without a time, and does not duplicate on a second send", async () => {
      const { id } = await createJob(E, img("sch1"));
      await claimForReading(id, E, "m");
      await finishJob(id, items("2031-06-01T08:00:00.000Z"));
      const job = (await getJob(E, id))!;

      expect(await sendToSchedule(E, job)).toEqual({ created: 1, alreadyThere: 0, skippedNoTime: 1 });
      expect(await sendToSchedule(E, job)).toEqual({ created: 0, alreadyThere: 1, skippedNoTime: 1 });
      const ev = await owner.query("select title, status, event_type, starts_at, updated_by from events where title like $1", [`%${tag}%`]);
      expect(ev.rows).toHaveLength(1);
      expect(ev.rows[0]).toMatchObject({ title: `เวที ${tag}`, status: "draft", event_type: "other", updated_by: E });
      expect(new Date(ev.rows[0].starts_at).toISOString()).toBe("2031-06-01T08:00:00.000Z");
    });

    it("can send a chosen subset only", async () => {
      const { id } = await createJob(E, img("sch2"));
      await claimForReading(id, E, "m");
      await finishJob(id, items("2031-07-01T08:00:00.000Z"));
      const job = (await getJob(E, id))!;
      expect(await sendToSchedule(E, job, [1])).toEqual({ created: 0, alreadyThere: 0, skippedNoTime: 1 });
    });
  });
});
