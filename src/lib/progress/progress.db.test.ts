import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { importGuestProgress, loadProgress, markLearned, saveRun, type Database } from "./repository";
import { guestProgress, runInput } from "./validation";

/** Real Postgres. Skips itself without DATABASE_URL_TEST, so a local green is not proof the schema ran. */
const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("progress in Postgres", () => {
  let sql: ReturnType<typeof postgres>;
  let db: Database;
  const userId = `test-${crypto.randomUUID()}`;

  beforeAll(async () => {
    sql = postgres(url!, { max: 1 });
    db = drizzle(sql, { schema });
    await db.insert(user).values({ id: userId, name: "Test", email: `${userId}@example.test` });
  });

  afterAll(async () => {
    await sql`delete from "user" where id = ${userId}`;
    await sql.end();
  });

  it("starts empty", async () => {
    expect(await loadProgress(db, userId)).toEqual({ learned: {}, best: {} });
  });

  it("remembers learned chords once", async () => {
    await markLearned(db, userId, "Em");
    await markLearned(db, userId, "Em");
    expect((await loadProgress(db, userId)).learned).toEqual({ Em: true });
  });

  it("keeps the fastest step and the highest timed score", async () => {
    await saveRun(db, userId, { songId: "drill-em-am", mode: "step", value: 3200 });
    await saveRun(db, userId, { songId: "drill-em-am", mode: "step", value: 2600 });
    await saveRun(db, userId, { songId: "drill-em-am", mode: "timed", value: 0.5, bpm: 100 });
    await saveRun(db, userId, { songId: "drill-em-am", mode: "timed", value: 0.8, bpm: 100 });
    expect((await loadProgress(db, userId)).best["drill-em-am"]).toEqual({ step: 2600, timed: expect.closeTo(0.8, 5) });
  });

  it("merges guest progress without losing a better account result", async () => {
    await importGuestProgress(db, userId, { learned: { Am: true }, best: { "drill-em-am": { step: 4000, timed: 0.9 } } });
    const progress = await loadProgress(db, userId);
    expect(progress.learned).toEqual({ Em: true, Am: true });
    expect(progress.best["drill-em-am"]!.step).toBe(2600);
    expect(progress.best["drill-em-am"]!.timed).toBeCloseTo(0.9, 5);
  });
});

describe("input validation", () => {
  it("refuses songs that are not in the catalogue", () => {
    expect(runInput.safeParse({ songId: "nope", mode: "step", value: 1000 }).success).toBe(false);
  });

  it("refuses a timed score above 100%", () => {
    expect(runInput.safeParse({ songId: "jolene", mode: "timed", value: 1.2 }).success).toBe(false);
  });

  it("refuses unknown chords in guest progress", () => {
    expect(guestProgress.safeParse({ learned: { Fmaj7: true }, best: {} }).success).toBe(false);
  });
});
