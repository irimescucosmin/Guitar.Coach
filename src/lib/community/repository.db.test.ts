import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { saveRun, type Database } from "@/lib/progress/repository";
import { createCommunitySong, findCommunitySong, listCommunitySongs, publishIfPassed, reportSong, REPORTS_TO_HIDE, updateCommunitySong } from "./repository";
import type { CommunitySongInput } from "./song";

const url = process.env.DATABASE_URL_TEST;

const input: CommunitySongInput = {
  title: "Giro di Sol",
  kind: "traditional",
  origin: "Tradizionale",
  beatsPerBar: 4,
  pattern: "down",
  sections: [{ name: "loop", bars: ["G", "D"], repeat: 2 }],
};

describe.skipIf(!url)("community repository", () => {
  let sql: ReturnType<typeof postgres>;
  let db: Database;
  const ids = Array.from({ length: 4 }, () => `test-${crypto.randomUUID()}`);
  const [author, other, third, fourth] = ids as [string, string, string, string];

  beforeAll(async () => {
    sql = postgres(url!, { max: 1 });
    db = drizzle(sql, { schema });
    await db.insert(user).values(ids.map((id, i) => ({ id, name: `Player ${i}`, email: `${id}@example.test` })));
  });
  afterAll(async () => {
    await sql`delete from "user" where id in ${sql(ids)}`;
    await sql.end();
  });

  it("stays a draft, visible to its author only, until the author passes it in time", async () => {
    const id = await createCommunitySong(db, author, input);
    expect(id.startsWith("c-")).toBe(true);
    expect((await listCommunitySongs(db, author)).map((s) => s.id)).toContain(id);
    expect((await listCommunitySongs(db, other)).map((s) => s.id)).not.toContain(id);

    // Somebody else passing it does not publish it, nor does the author falling short.
    await saveRun(db, other, { songId: id, mode: "timed", value: 0.95 });
    await saveRun(db, author, { songId: id, mode: "timed", value: 0.5 });
    expect(await publishIfPassed(db, author, id)).toBe(false);
    expect((await findCommunitySong(db, id))?.status).toBe("draft");

    await saveRun(db, author, { songId: id, mode: "timed", value: 0.85 });
    expect(await publishIfPassed(db, author, id)).toBe(true);
    expect(await publishIfPassed(db, author, id)).toBe(false); // already published
    const song = await findCommunitySong(db, id);
    expect(song?.status).toBe("published");
    expect(song?.authorName).toBe("Player 0");
    expect(song?.plays).toBe(1); // the other player, not the author
    expect((await listCommunitySongs(db, other)).map((s) => s.id)).toContain(id);

    // A published song is what others practised: it cannot be edited any more.
    expect(await updateCommunitySong(db, author, id, { ...input, title: "Altro" })).toBe(false);
    expect(await updateCommunitySong(db, other, id, input)).toBe(false);
  });

  it("hides a song at the third report from different players, counting each player once", async () => {
    const id = await createCommunitySong(db, author, input);
    await saveRun(db, author, { songId: id, mode: "timed", value: 0.9 });
    await publishIfPassed(db, author, id);

    expect(REPORTS_TO_HIDE).toBe(3);
    expect(await reportSong(db, other, id, "lyrics", null)).toEqual({ hidden: false });
    expect(await reportSong(db, other, id, "wrong", null)).toEqual({ hidden: false }); // same player again
    expect(await reportSong(db, third, id, "wrong", null)).toEqual({ hidden: false });
    expect(await reportSong(db, fourth, id, "other", "boh")).toEqual({ hidden: true });
    expect((await findCommunitySong(db, id))?.status).toBe("hidden");
    expect((await listCommunitySongs(db, other)).map((s) => s.id)).not.toContain(id);
    expect((await listCommunitySongs(db, author)).map((s) => s.id)).toContain(id);
  });
});
