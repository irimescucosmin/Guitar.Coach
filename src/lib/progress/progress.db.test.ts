import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import type { Profile } from "@/lib/music/profile";
import { importGuestProgress, loadHistory, loadProgress, loadRoutine, markLearned, markRoutine, saveChangeTest, saveProfile, saveRun, type Database } from "./repository";
import { answersInput, guestProgress, optionalDay, profileInput, proofInput, runInput } from "./validation";
import { localDate } from "@/lib/music/routine";
import { recordPractice } from "./practice";

const answers: Profile = {
  experience: "months",
  knowsOpenStrings: true,
  openStringsHeard: true,
  knownChords: ["G", "D", "C"],
  verifiedChords: ["G", "D"],
  checked: true,
  readsTab: "some",
  guitar: "acoustic",
  minutes: 20,
  style: "folkCountry",
  goal: "withOthers",
  takenAt: "2026-10-29T00:00:00.000Z",
};

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

  it("saves the answers and learns only the chords the microphone heard", async () => {
    await saveProfile(db, userId, answers);
    const progress = await loadProgress(db, userId);
    expect(progress.profile).toEqual(answers);
    expect(progress.learned).toEqual({ Em: true, Am: true, G: true, D: true });
  });

  it("keeps the best one-minute change test per pair", async () => {
    await saveChangeTest(db, userId, "G-D", 18);
    await saveChangeTest(db, userId, "G-D", 24);
    await saveChangeTest(db, userId, "Em-Am", 30);
    expect((await loadProgress(db, userId)).changes).toEqual({ "G-D": 24, "Em-Am": 30 });
  });

  it("logs routine blocks once per day and lists the days, newest first", async () => {
    await markRoutine(db, userId, "2026-10-28", ["tune", "new"]);
    await markRoutine(db, userId, "2026-10-29", ["tune"]);
    await markRoutine(db, userId, "2026-10-29", ["tune", "song"]);
    const today = await loadRoutine(db, userId, "2026-10-29");
    expect(today.done.sort()).toEqual(["song", "tune"]);
    expect(today.days).toEqual(["2026-10-29", "2026-10-28"]);
  });

  it("returns the history for the charts: every run, every test, the routine days", async () => {
    const h = await loadHistory(db, userId);
    // Four runs saved, two more from the guest import.
    expect(h.runs.filter((r) => r.song === "drill-em-am")).toHaveLength(6);
    expect(h.changes.map((c) => c.count).sort()).toEqual([18, 24, 30]);
    expect(h.days).toContainEqual({ day: "2026-10-29", blocks: 2 });
  });

  it("replaces the answers when given again, and keeps them over a guest's", async () => {
    await saveProfile(db, userId, { ...answers, minutes: 30 });
    await importGuestProgress(db, userId, { learned: {}, best: {}, profile: { ...answers, minutes: 10 } });
    expect((await loadProgress(db, userId)).profile?.minutes).toBe(30);
  });
});

describe.skipIf(!url)("routine ticked by the server", () => {
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

  it("ticks today's next step when the result that proves it is saved, and nothing for an unrelated one", async () => {
    // A new player's next step is lesson 0: the note drill.
    const other = await recordPractice(db, userId, "2026-10-29", { kind: "run", song: "drill-g-d", mode: "step" }, () =>
      saveRun(db, userId, { songId: "drill-g-d", mode: "step", value: 3000 }),
    );
    expect(other!.today?.done).toEqual([]);
    const notes = await recordPractice(db, userId, "2026-10-29", { kind: "run", song: "notes", mode: "notes" }, () =>
      saveRun(db, userId, { songId: "notes", mode: "step", value: 2500 }),
    );
    expect(notes!.today).toEqual({ done: ["new"], streak: 1 });
  });
});

describe("input validation", () => {
  it("narrows the answers to what can be true", () => {
    const parsed = profileInput.parse({ ...answers, knowsOpenStrings: false, openStringsHeard: true, verifiedChords: ["G", "A"] });
    expect(parsed.openStringsHeard).toBe(false);
    expect(parsed.verifiedChords).toEqual(["G"]);
  });

  it("keeps old answers where they placed the player: 'I know the open strings' before the check existed", () => {
    const old: Partial<Profile> = { ...answers };
    delete old.openStringsHeard;
    expect(profileInput.parse(old).openStringsHeard).toBe(true);
    expect(answersInput.safeParse(old).success).toBe(false);
  });

  it("accepts only a date close to today, and a proof by name", () => {
    expect(optionalDay.parse("1999-01-01")).toBeNull();
    expect(proofInput.safeParse({ day: localDate(new Date()), proof: "tuned" }).success).toBe(true);
    expect(proofInput.safeParse({ day: localDate(new Date()), proof: "song" }).success).toBe(false);
  });

  it("refuses songs that are not in the catalogue", () => {
    expect(runInput.safeParse({ songId: "nope", mode: "step", value: 1000 }).success).toBe(false);
  });

  it("refuses a timed score above 100%", () => {
    expect(runInput.safeParse({ songId: "jolene", mode: "timed", value: 1.2 }).success).toBe(false);
  });

  it("accepts guest progress that covers only part of the catalogue", () => {
    const parsed = guestProgress.safeParse({ learned: { Em: true }, best: { jolene: { timed: 0.5 } } });
    expect(parsed.success).toBe(true);
  });

  it("drops unknown chords and songs from guest progress and keeps the rest", () => {
    const parsed = guestProgress.parse({ learned: { Fmaj7: true, Em: true }, best: { "old-song": { step: 1 }, jolene: { timed: 0.5 } } });
    expect(parsed).toEqual({ learned: { Em: true }, best: { jolene: { timed: 0.5 } } });
  });

  it("drops a broken profile from guest progress and keeps the rest", () => {
    const parsed = guestProgress.parse({ learned: { Em: true }, best: {}, profile: { experience: "forever" } });
    expect(parsed).toEqual({ learned: { Em: true }, best: {} });
  });

  it("keeps only known chords in the answers", () => {
    const parsed = profileInput.parse({ ...answers, knownChords: ["G", "Bb7", "G"] });
    expect(parsed.knownChords).toEqual(["G"]);
  });

  it("still refuses values out of range", () => {
    expect(guestProgress.safeParse({ learned: {}, best: { jolene: { timed: 3 } } }).success).toBe(false);
  });
});
