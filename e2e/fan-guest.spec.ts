import { expect, test } from "@playwright/test";
import pg from "pg";

// Guest smoke tests for the fan club. Signed-in flows (binder, capsule, room, chat from a second browser) need a saved
// sign-in and are not covered here; the data side of them is covered by the vitest suites on the Neon branch.

const LOGIN_PAGES = ["/fan/schedule-reader", "/fan/binder", "/fan/capsule", "/fan/wrapped/2026", "/fan/room"];

test.describe("/fan hub as a guest", () => {
  test("renders the hub, the countdown and fits the screen width", async ({ page }) => {
    await page.goto("/fan");
    await expect(page.getByRole("heading", { name: /Who’s your bias/ })).toBeVisible();
    const timer = page.getByRole("timer");
    await expect(timer).toBeVisible();
    await expect(timer.locator("span").filter({ hasText: /^\d\d$/ }).first()).toBeVisible(); // client clock started
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("the bias choice is remembered after a reload (localStorage)", async ({ page }) => {
    await page.goto("/fan");
    const stella = page.getByRole("button", { name: "Stella", exact: true }).first();
    await stella.click();
    await expect(stella).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Stella’s color")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Stella’s color")).toBeVisible();
    await page.getByRole("button", { name: "Use era colors instead" }).click(); // leave it as we found it
  });

  test("Add to calendar serves a valid .ics for the countdown", async ({ page, request }) => {
    await page.goto("/fan");
    const href = await page.getByRole("link", { name: "Add to calendar" }).getAttribute("href");
    expect(href).toMatch(/^\/api\/fan\/ics\?countdown=/);
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });
});

test.describe("login-required pages", () => {
  for (const path of LOGIN_PAGES) {
    test(`${path} sends a guest to sign in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    });
  }
});

test.describe("waiting room as a guest", () => {
  const owner = process.env.FAN_TEST_OWNER_URL;
  test.skip(!owner, "needs FAN_TEST_OWNER_URL (a Neon branch) to open a room for the seeded countdown");

  test("shows the countdown, counts the guest as online and keeps the chat for signed-in fans", async ({ page }) => {
    // open a room for the hub's countdown (dev branch only); remember whether we created it so we can undo it
    await page.goto("/fan");
    const href = await page.getByRole("link", { name: "Join the waiting room" }).getAttribute("href");
    const countdownId = href!.split("/").pop()!;
    const db = new pg.Client({ connectionString: owner });
    await db.connect();
    let created = false;
    try {
      const had = (await db.query("select 1 from live_rooms where countdown_id = $1", [countdownId])).rowCount;
      if (!had) {
        await db.query(
          "insert into live_rooms (countdown_id, opens_at, closes_at, slow_mode_sec) values ($1, now() - interval '5 minutes', now() + interval '1 hour', 5)",
          [countdownId],
        );
        created = true;
      }

      await page.goto(href!);
      await expect(page.getByRole("heading", { name: /waiting together/ })).toBeVisible();
      await expect(page.getByText(/Sign in to read the chat/i)).toBeVisible();
      await expect(page.getByText(/S2U in the room/)).toBeVisible();
      await expect(page.getByRole("timer").or(page.getByText(/\d+d \d\d:\d\d:\d\d/))).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      // the preview counts down from 15 s; at 10 s the room turns S2U sky blue and says "Final countdown"
      await page.getByRole("button", { name: /Preview the last 10 seconds/ }).click();
      await expect(page.getByText(/Final countdown/i)).toBeVisible({ timeout: 15_000 });
    } finally {
      if (created) await db.query("delete from live_rooms where countdown_id = $1", [countdownId]);
      await db.end();
    }
  });
});
