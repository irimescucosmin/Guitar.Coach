import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import type { Database } from "@/lib/progress/repository";
import { listConversations, listMessages, listNotifications, markConversationRead, markNotificationsRead, notify, notifyOnce, reportMessage, sendMessage, setAcceptsMessages, setBlocked, unreadMessages, unreadNotifications } from "./repository";
import { NOTIFICATIONS_KEPT, REPORTERS_TO_MUTE, UNANSWERED_LIMIT } from "./rules";

const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("social repository", () => {
  let sql: ReturnType<typeof postgres>;
  let db: Database;
  const ids = Array.from({ length: 3 }, () => `test-${crypto.randomUUID()}`);
  const [anna, bo, cy] = ids as [string, string, string];

  beforeAll(async () => {
    sql = postgres(url!, { max: 1 });
    db = drizzle(sql, { schema });
    await db.insert(user).values(ids.map((id, i) => ({ id, name: ["Anna", "Bo", "Cy"][i]!, email: `${id}@example.test` })));
  });
  afterAll(async () => {
    await sql`delete from "user" where id in ${sql(ids)}`;
    await sql.end();
  });

  it("keeps a player's notifications, unread until read, never more than the limit", async () => {
    await notify(db, anna, "songPublished", { songId: "c-1", title: "Giro" });
    await notifyOnce(db, anna, "songPassed", { songId: "c-1", title: "Giro", by: "Bo" }, "songId");
    await notifyOnce(db, anna, "songPassed", { songId: "c-1", title: "Giro", by: "Bo" }, "songId"); // same, unread: not again
    expect(await unreadNotifications(db, anna)).toBe(2);
    const list = await listNotifications(db, anna);
    expect(list.map((n) => n.kind)).toEqual(["songPassed", "songPublished"]);
    await markNotificationsRead(db, anna);
    expect(await unreadNotifications(db, anna)).toBe(0);
    for (let i = 0; i < NOTIFICATIONS_KEPT + 5; i++) await notify(db, anna, "songPublished", { songId: `c-${i}` });
    expect((await listNotifications(db, anna, 500)).length).toBe(NOTIFICATIONS_KEPT);
  });

  it("carries a message, tells the recipient once, and stops a monologue at the limit", async () => {
    const first = await sendMessage(db, bo, anna, "Bo", "Bel giro, lo suono a 90 bpm.");
    expect(first).toMatchObject({ ok: true });
    expect(await sendMessage(db, bo, anna, "Bo", "scrivimi su bo@example.com")).toEqual({ ok: false, reason: "contact" });
    expect(await sendMessage(db, bo, bo, "Bo", "ciao me")).toEqual({ ok: false, reason: "self" });
    for (let i = 1; i < UNANSWERED_LIMIT; i++) expect((await sendMessage(db, bo, anna, "Bo", `ancora ${i}`)).ok).toBe(true);
    expect(await sendMessage(db, bo, anna, "Bo", "e ancora")).toEqual({ ok: false, reason: "unanswered" });
    expect(await unreadMessages(db, anna)).toBe(1); // one line for the thread, not one per message
    const [thread] = await listConversations(db, anna);
    expect(thread).toMatchObject({ other: { id: bo, name: "Bo" }, unread: 1, blocked: false });
    expect((await listMessages(db, thread!.id)).map((m) => m.body)).toEqual(["Bel giro, lo suono a 90 bpm.", "ancora 1", "ancora 2"]);
    await markConversationRead(db, anna, thread!.id);
    expect(await unreadMessages(db, anna)).toBe(0);
    // Anna answers: Bo may write again.
    expect((await sendMessage(db, anna, bo, "Anna", "Grazie!")).ok).toBe(true);
    expect((await sendMessage(db, bo, anna, "Bo", "Di niente")).ok).toBe(true);
  });

  it("respects a block and a closed door", async () => {
    await setBlocked(db, anna, bo, true);
    expect(await sendMessage(db, bo, anna, "Bo", "ci sei?")).toEqual({ ok: false, reason: "blocked" });
    expect(await sendMessage(db, anna, bo, "Anna", "no")).toEqual({ ok: false, reason: "blocked" });
    expect((await listConversations(db, anna))[0]?.blocked).toBe(true);
    await setBlocked(db, anna, bo, false);
    await setAcceptsMessages(db, cy, false);
    expect(await sendMessage(db, bo, cy, "Bo", "ciao")).toEqual({ ok: false, reason: "closed" });
    await setAcceptsMessages(db, cy, true);
    expect((await sendMessage(db, bo, cy, "Bo", "ciao")).ok).toBe(true);
  });

  it("hides a reported message at once, and mutes a player reported by enough different people", async () => {
    const sent = await sendMessage(db, cy, bo, "Cy", "messaggio da segnalare");
    if (!sent.ok) throw new Error(sent.reason);
    expect(await reportMessage(db, cy, sent.id, "spam")).toBeNull(); // own message
    expect(await reportMessage(db, anna, sent.id, "spam")).toBeNull(); // not in the thread
    expect(await reportMessage(db, bo, sent.id, "spam")).toEqual({ hidden: true });
    const [thread] = (await listConversations(db, bo)).filter((c) => c.other.id === cy);
    expect((await listMessages(db, thread!.id)).find((m) => m.id === sent.id)?.hidden).toBe(true);
    // Reported by one player: still allowed to write. By REPORTERS_TO_MUTE different ones: not any more.
    expect((await sendMessage(db, cy, anna, "Cy", "ciao Anna")).ok).toBe(true);
    const more = Array.from({ length: REPORTERS_TO_MUTE - 1 }, () => `test-${crypto.randomUUID()}`);
    await db.insert(user).values(more.map((id) => ({ id, name: "R", email: `${id}@example.test` })));
    ids.push(...more);
    for (const r of more) {
      const m = await sendMessage(db, cy, r, "Cy", "ehi");
      if (!m.ok) throw new Error(m.reason);
      await reportMessage(db, r, m.id, "offensive");
    }
    expect(await sendMessage(db, cy, anna, "Cy", "ancora")).toEqual({ ok: false, reason: "muted" });
  });
});
