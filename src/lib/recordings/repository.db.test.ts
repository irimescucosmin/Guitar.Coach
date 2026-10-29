import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { KEEP_WEEKS } from "@/lib/music/recordings";
import type { Database } from "@/lib/progress/repository";
import { listRecordings, readRecording, saveRecording } from "./repository";

const url = process.env.DATABASE_URL_TEST;

const base = { songId: "drill-em-am", mode: "timed" as const, share: 0.8, durationMs: 20_000, mime: "audio/webm" };
const audio = (text: string) => Buffer.from(text);

describe.skipIf(!url)("recordings repository", () => {
  let sql: ReturnType<typeof postgres>;
  let db: Database;
  const me = `test-${crypto.randomUUID()}`;
  const other = `test-${crypto.randomUUID()}`;

  beforeAll(async () => {
    sql = postgres(url!, { max: 1 });
    db = drizzle(sql, { schema });
    await db.insert(user).values([me, other].map((id) => ({ id, name: "Test", email: `${id}@example.test` })));
  });
  afterAll(async () => {
    await sql`delete from "user" where id in ${sql([me, other])}`;
    await sql.end();
  });

  it("keeps one recording per week, the latest, and gives the audio to its owner only", async () => {
    const first = await saveRecording(db, me, { ...base, day: "2026-10-27", audio: audio("tuesday") });
    const second = await saveRecording(db, me, { ...base, day: "2026-10-29", audio: audio("thursday") });
    const list = await listRecordings(db, me);
    expect(list.map((r) => r.id)).toEqual([second]);
    expect(list[0]).toMatchObject({ song: "drill-em-am", week: "2026-10-26", day: "2026-10-29", share: 0.8 });
    expect(await readRecording(db, me, first)).toBeNull();
    expect((await readRecording(db, me, second))?.audio.toString()).toBe("thursday");
    expect(await readRecording(db, other, second)).toBeNull();
    expect(await listRecordings(db, other)).toEqual([]);
  });

  it("drops the oldest weeks past the limit", async () => {
    const monday = Date.UTC(2025, 0, 6); // a Monday, long before the week above
    for (let w = 0; w < KEEP_WEEKS + 2; w++) {
      const day = new Date(monday + w * 7 * 86_400_000).toISOString().slice(0, 10);
      await saveRecording(db, me, { ...base, day, audio: audio(day) });
    }
    const list = await listRecordings(db, me);
    expect(list).toHaveLength(KEEP_WEEKS);
    expect(list[0]!.week).toBe("2026-10-26"); // the newest stays
    expect(list.at(-1)!.week > "2025-01-06").toBe(true);
  });
});
