import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { countQuestions, type Database } from "@/lib/progress/repository";

// The model is replaced: these tests are about limits, caching and storage, not answers.
const askMock = vi.fn(async (system: string, userText: string) => ({ text: `answer to: ${userText} | ${system.length}`, inputTokens: 1, outputTokens: 1 }));
let enabled = true;
vi.mock("./model", () => ({ ask: (...a: [string, string]) => askMock(...a), coachEnabled: () => enabled }));
vi.mock("server-only", () => ({}));

const { answerQuestion, weeklySummary } = await import("./service");
const { mondayOf } = await import("@/lib/music/recordings");
const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("coach service", () => {
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

  it("is off without a key, and says so", async () => {
    enabled = false;
    expect(await answerQuestion(db, userId, "it", "2026-10-29", "ciao")).toEqual({ ok: false, reason: "off" });
    expect(await weeklySummary(db, userId, "it", "2026-10-29")).toBeNull();
    enabled = true;
  });

  it("answers with the facts in the brief, saves the exchange and counts it", async () => {
    const r = await answerQuestion(db, userId, "it", "2026-10-29", "Perché ronza?");
    expect(r).toMatchObject({ ok: true, left: 19 });
    expect(askMock.mock.lastCall?.[0]).toContain("Answer in Italian");
    expect(askMock.mock.lastCall?.[0]).toContain("Has not answered the questionnaire yet.");
    expect(await countQuestions(db, userId, "2026-10-29")).toBe(1);
  });

  it("stops at the daily limit", async () => {
    for (let i = 0; i < 19; i++) await answerQuestion(db, userId, "it", "2026-10-29", `q${i}`);
    expect(await answerQuestion(db, userId, "it", "2026-10-29", "una in più")).toEqual({ ok: false, reason: "limit" });
    // Another day starts again.
    expect((await answerQuestion(db, userId, "it", "2026-10-30", "domani")).ok).toBe(true);
  });

  it("writes the weekly summary once and reuses it for the week", async () => {
    const calls = askMock.mock.calls.length;
    const first = await weeklySummary(db, userId, "en", "2026-10-29");
    const again = await weeklySummary(db, userId, "en", "2026-10-31");
    expect(first).toBe(again);
    expect(askMock.mock.calls.length).toBe(calls + 1);
    expect(mondayOf("2026-10-29")).toBe("2026-10-26");
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
  });

  it("reports a failure of the model without saving anything", async () => {
    askMock.mockRejectedValueOnce(new Error("down"));
    const before = await countQuestions(db, userId, "2026-11-01");
    expect(await answerQuestion(db, userId, "it", "2026-11-01", "x?")).toEqual({ ok: false, reason: "failed" });
    expect(await countQuestions(db, userId, "2026-11-01")).toBe(before);
  });
});
