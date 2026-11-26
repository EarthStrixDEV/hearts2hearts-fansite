// Integration tests for the phase 4 data layer (binder, trade matching, trade lifecycle, match notices) against a Neon BRANCH with
// 0010 + 0012 applied. Same env contract and fixture rules as fan-rls.test.ts: FAN_TEST_OWNER_URL / FAN_TEST_APP_URL, uniquely
// tagged fixtures, deleted in afterAll. Skipped (not passed) without them.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getBinderCards, getMyTrades, getTradeMatches, listBinderAlbums, recordNewTradeMatches, sendTradeRequest, setCardState, updateTrade,
} from "./fan-binder";

const OWNER_URL = process.env.FAN_TEST_OWNER_URL;
const APP_URL = process.env.FAN_TEST_APP_URL;
const enabled = Boolean(OWNER_URL && APP_URL);
if (APP_URL) process.env.DATABASE_URL_APP = APP_URL;
if (OWNER_URL) process.env.DATABASE_URL = OWNER_URL; // the cron helper uses the owner client

describe.skipIf(!enabled)("fan binder + trades (fan_app)", () => {
  const owner = new pg.Client({ connectionString: OWNER_URL });
  const [A, B, C] = [randomUUID(), randomUUID(), randomUUID()];
  const id = { album: randomUUID(), album2: randomUUID(), m1: randomUUID(), m2: randomUUID(), pc1: randomUUID(), pc2: randomUUID(), pc3: randomUUID(), pcDraft: randomUUID(), pcOther: randomUUID() };
  const tag = randomUUID().slice(0, 8);
  const setCards = async (user: string, have: string[], want: string[]) => {
    for (const [cards, state] of [[have, "have"], [want, "want"]] as const) {
      for (const c of cards) await owner.query("insert into fan_cards (user_id, photocard_id, state) values ($1,$2,$3) on conflict (user_id, photocard_id) do update set state = excluded.state", [user, c, state]);
    }
  };
  const clearCards = () => owner.query("delete from fan_cards where user_id = any($1)", [[A, B, C]]);
  const clearTrades = () => owner.query("delete from trade_requests where from_user = any($1) or to_user = any($1)", [[A, B, C]]);

  beforeAll(async () => {
    await owner.connect();
    for (const [uid, name] of [[A, "Ann"], [B, "Bee"], [C, "Cee"]] as const) {
      await owner.query(`insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`, [uid, `bnd-${tag}`, `bnd-${tag}-${uid.slice(0, 6)}@test.invalid`]);
      await owner.query("insert into profiles (id, display_name, role) values ($1, $2, 'fan')", [uid, `${name}-${tag}`]);
    }
    for (const [aid, title] of [[id.album, "A"], [id.album2, "B"]]) {
      await owner.query("insert into albums (id, slug, title, album_type, status) values ($1, $2, $3, 'single', 'published')", [aid, `bnd-${aid.slice(0, 8)}-${tag}`, `Binder ${title} ${tag}`]);
    }
    for (const [mid, name, so] of [[id.m1, "Alpha", 1], [id.m2, "Beta", 2]] as const) {
      await owner.query("insert into members (id, slug, stage_name, status, sort_order) values ($1, $2, $3, 'published', $4)", [mid, `bnd-${mid.slice(0, 8)}-${tag}`, `${name}${tag}`, so]);
    }
    const cards: [string, string, string, string, string, number][] = [
      [id.pc1, id.album, id.m1, "A", "published", 1], [id.pc2, id.album, id.m2, "A", "published", 2], [id.pc3, id.album, id.m1, "B", "published", 3],
      [id.pcDraft, id.album, id.m2, "B", "draft", 4], [id.pcOther, id.album2, id.m1, "A", "published", 1],
    ];
    for (const [pid, aid, mid, ver, status, so] of cards) {
      await owner.query("insert into photocards (id, album_id, member_id, version, status, sort_order) values ($1,$2,$3,$4,$5,$6)", [pid, aid, mid, ver, status, so]);
    }
  });

  afterAll(async () => {
    try {
      await owner.query(`delete from neon_auth."user" where id = any($1)`, [[A, B, C]]); // cascades profiles, fan_cards, trades, notices, activity
      await owner.query("delete from albums where id = any($1)", [[id.album, id.album2]]); // cascades photocards
      await owner.query("delete from members where id = any($1)", [[id.m1, id.m2]]);
    } finally {
      await owner.end();
    }
  });

  it("lists albums with published cards and the viewer's slot states", async () => {
    const albums = await listBinderAlbums(A);
    expect(albums.find((a) => a.id === id.album)?.cards).toBe(3); // the draft card is not counted
    expect(albums.find((a) => a.id === id.album2)?.cards).toBe(1);
    const cards = await getBinderCards(A, id.album);
    expect(cards.map((c) => c.id)).toEqual([id.pc1, id.pc2, id.pc3]);
    expect(cards.every((c) => c.state === "missing")).toBe(true);
  });

  it("cycles a slot: have logs the card activity once, want and missing change the row, a draft card is refused", async () => {
    const count = async (kind: string) => Number((await owner.query("select count(*) from fan_activity where user_id = $1 and kind = $2", [A, kind])).rows[0].count);
    expect(await setCardState(A, id.pc1, "have")).toBe(true);
    expect((await getBinderCards(A, id.album)).find((c) => c.id === id.pc1)?.state).toBe("have");
    expect(await count("card")).toBe(1);
    expect(await setCardState(A, id.pc1, "want")).toBe(true);
    expect(await setCardState(A, id.pc1, "have")).toBe(true); // flipping back must not farm the counter
    expect(await count("card")).toBe(1);
    expect(await setCardState(A, id.pc1, "missing")).toBe(true);
    expect((await getBinderCards(A, id.album)).find((c) => c.id === id.pc1)?.state).toBe("missing");
    expect(await setCardState(A, id.pcDraft, "have")).toBe(false);
    expect(Number((await owner.query("select count(*) from fan_cards where user_id = $1", [A])).rows[0].count)).toBe(0);
    // one fan's binder is invisible to another
    await setCardState(B, id.pc2, "have");
    expect((await getBinderCards(A, id.album)).find((c) => c.id === id.pc2)?.state).toBe("missing");
    await clearCards();
  });

  it("matches two fans who each have what the other wants, from both sides, and nobody else", async () => {
    await setCards(A, [id.pc1], [id.pc2]);
    await setCards(B, [id.pc2], [id.pc1]);
    await setCards(C, [id.pc2], [id.pc3]); // has what A wants, but wants a card A does not have
    const a = await getTradeMatches(A, null);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ partnerId: B, partnerName: `Bee-${tag}`, options: 1, give: { id: id.pc1 }, get: { id: id.pc2 } });
    const b = await getTradeMatches(B, id.album);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ partnerId: A, give: { id: id.pc2 }, get: { id: id.pc1 } });
    expect(await getTradeMatches(C, null)).toEqual([]);
    expect(await getTradeMatches(A, id.album2)).toEqual([]); // other album: both cards must be in it
  });

  it("ignores draft cards and counts several possible swaps per partner (one row per partner)", async () => {
    await clearCards();
    await setCards(A, [id.pc1, id.pc3], [id.pc2, id.pcDraft]);
    await setCards(B, [id.pc2, id.pcDraft], [id.pc1, id.pc3]);
    const a = await getTradeMatches(A, null);
    expect(a).toHaveLength(1);
    expect(a[0].options).toBe(2); // pc1<->pc2 and pc3<->pc2; the pc<->draft swaps are not offered
    expect([a[0].get.id]).toEqual([id.pc2]);
  });

  it("records each new match once (scoped to the fixture fans) and never twice", async () => {
    await clearCards();
    await setCards(A, [id.pc1], [id.pc2]);
    await setCards(B, [id.pc2], [id.pc1]);
    const first = await recordNewTradeMatches([A, B]);
    expect(first).toMatchObject({ newMatches: 2, users: 2 });
    expect(first.recipients.sort()).toEqual([A, B].sort());
    expect(await recordNewTradeMatches([A, B])).toMatchObject({ newMatches: 0, users: 0 });
    const noticeRows = (await owner.query("select count(*) from trade_match_notices where user_id = any($1)", [[A, B]])).rows[0].count;
    expect(Number(noticeRows)).toBe(2);
    // fan_app cannot read or write the notice table
    const { withUser } = await import("./fan-client");
    await expect(withUser(A, (q) => q("select * from trade_match_notices"))).rejects.toMatchObject({ code: "42501" });
  });

  it("sends a request only for a real match, and not twice", async () => {
    await clearTrades();
    expect((await sendTradeRequest(A, { partnerId: C, giveCardId: id.pc1, getCardId: id.pc2 })).ok).toBe(false); // C is not a match
    expect((await sendTradeRequest(A, { partnerId: B, giveCardId: id.pc1, getCardId: id.pc3 })).ok).toBe(false); // wrong cards
    const sent = await sendTradeRequest(A, { partnerId: B, giveCardId: id.pc1, getCardId: id.pc2 });
    expect(sent.ok).toBe(true);
    expect((await sendTradeRequest(A, { partnerId: B, giveCardId: id.pc1, getCardId: id.pc2 })).ok).toBe(false);
    expect((await sendTradeRequest(B, { partnerId: A, giveCardId: id.pc2, getCardId: id.pc1 })).ok).toBe(false); // the reverse is already open
    expect(await getTradeMatches(A, null)).toEqual([]); // open trade: the pair leaves the match list
    const mine = await getMyTrades(A);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ state: "pending", outgoing: true, partnerName: `Bee-${tag}`, give: `Alpha${tag} ver. A`, get: `Beta${tag} ver. A` });
    const theirs = await getMyTrades(B);
    expect(theirs[0]).toMatchObject({ outgoing: false, give: `Beta${tag} ver. A`, get: `Alpha${tag} ver. A` });
    expect(await getMyTrades(C)).toEqual([]);
  });

  it("walks pending -> accepted -> shipped -> done with the party rules and ratings", async () => {
    const [t] = await getMyTrades(A);
    const bad = (r: { ok: boolean; error?: string }) => { expect(r.ok).toBe(false); return r.error; };
    expect(bad(await updateTrade(A, { id: t.id, kind: "accept" }))).toMatch(/can't do that/); // only the recipient accepts
    expect(bad(await updateTrade(C, { id: t.id, kind: "cancel" }))).toMatch(/changed/); // not a party: RLS hides the row
    expect((await updateTrade(B, { id: t.id, kind: "accept" })).ok).toBe(true);
    bad(await updateTrade(B, { id: t.id, kind: "receive" })); // not shipped yet
    expect((await updateTrade(A, { id: t.id, kind: "ship", trackingNo: "TH123" })).ok).toBe(true);
    expect((await getMyTrades(A))[0]).toMatchObject({ state: "shipped", trackingNo: "TH123", shippedByMe: true });
    expect(bad(await updateTrade(A, { id: t.id, kind: "receive" }))).toMatch(/can't do that/); // the shipper cannot confirm delivery
    expect(bad(await updateTrade(B, { id: t.id, kind: "rate", rating: 5 }))).toMatch(/changed/); // not done yet
    expect((await updateTrade(B, { id: t.id, kind: "receive" })).ok).toBe(true);
    expect((await updateTrade(A, { id: t.id, kind: "rate", rating: 4 })).ok).toBe(true);
    expect((await updateTrade(B, { id: t.id, kind: "rate", rating: 5 })).ok).toBe(true);
    expect(bad(await updateTrade(A, { id: t.id, kind: "rate", rating: 1 }))).toMatch(/isn't allowed/); // rated once only
    expect((await getMyTrades(A))[0]).toMatchObject({ state: "done", myRating: 4, theirRating: 5 });
    expect((await getMyTrades(B))[0]).toMatchObject({ state: "done", myRating: 5, theirRating: 4 });
    expect(bad(await updateTrade(A, { id: t.id, kind: "cancel" }))).toMatch(/changed/); // done cannot be cancelled
  });

  it("lets either side cancel a pending trade, and a cancelled trade drops out of the list", async () => {
    await clearTrades();
    const sent = await sendTradeRequest(A, { partnerId: B, giveCardId: id.pc1, getCardId: id.pc2 });
    expect(sent.ok).toBe(true);
    const [t] = await getMyTrades(B);
    expect((await updateTrade(B, { id: t.id, kind: "cancel" })).ok).toBe(true);
    expect(await getMyTrades(A)).toEqual([]);
    expect(await getTradeMatches(A, null)).toHaveLength(1); // cancelled does not block a new request
  });
});
