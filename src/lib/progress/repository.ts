import { and, count, desc, eq, gte, max, min } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { isChordId } from "@/lib/music/chords";
import { EMPTY_PROGRESS, type Progress } from "@/lib/music/path";
import * as schema from "@/db/schema";
import { changeTests, chordMastery, coachMessages, playerProfile, practiceRuns, routineLog } from "@/db/schema";
import type { BlockId } from "@/lib/music/routine";
import type { History } from "@/lib/music/history";
import { placedChords, type Profile } from "@/lib/music/profile";
import { profileInput, type GuestProgress, type RunInput } from "./validation";

/**
 * Progress in Postgres. Takes the database as an argument so the same code runs
 * against the app's pool and against the test database.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export async function loadProgress(db: Database, userId: string): Promise<Progress> {
  const [learnedRows, bestRows, profileRows, changeRows] = await Promise.all([
    db.select({ chord: chordMastery.chord }).from(chordMastery).where(eq(chordMastery.userId, userId)),
    db
      .select({
        songId: practiceRuns.songId,
        mode: practiceRuns.mode,
        fastest: min(practiceRuns.value),
        highest: max(practiceRuns.value),
      })
      .from(practiceRuns)
      .where(eq(practiceRuns.userId, userId))
      .groupBy(practiceRuns.songId, practiceRuns.mode),
    db.select({ answers: playerProfile.answers }).from(playerProfile).where(eq(playerProfile.userId, userId)),
    db
      .select({ pair: changeTests.pair, best: max(changeTests.count) })
      .from(changeTests)
      .where(eq(changeTests.userId, userId))
      .groupBy(changeTests.pair),
  ]);

  const progress: Progress = { learned: {}, best: {} };
  for (const { chord } of learnedRows) if (isChordId(chord)) progress.learned[chord] = true;
  for (const row of bestRows) {
    const value = row.mode === "step" ? row.fastest : row.highest;
    if (value === null) continue;
    progress.best[row.songId] = { ...progress.best[row.songId], [row.mode]: value };
  }
  // Answers saved by an older version of the questions are simply not there.
  const profile = profileInput.safeParse(profileRows[0]?.answers);
  if (profile.success) progress.profile = profile.data;
  if (changeRows.length > 0) {
    progress.changes = {};
    for (const row of changeRows) if (row.best !== null) progress.changes[row.pair] = row.best;
  }
  return progress;
}

export async function markLearned(db: Database, userId: string, chord: string): Promise<void> {
  await db.insert(chordMastery).values({ userId, chord }).onConflictDoNothing();
}

export async function saveChangeTest(db: Database, userId: string, pair: string, count: number): Promise<void> {
  await db.insert(changeTests).values({ userId, pair, count });
}

/** Marks routine blocks done on the player's day; doing one twice changes nothing. */
export async function markRoutine(db: Database, userId: string, day: string, blocks: readonly BlockId[]): Promise<void> {
  await db.insert(routineLog).values(blocks.map((block) => ({ userId, day, block }))).onConflictDoNothing();
}

/** One day's done blocks, and every day with something done (the last year), newest first. */
export async function loadRoutine(db: Database, userId: string, day: string): Promise<{ done: BlockId[]; days: string[] }> {
  const [doneRows, dayRows] = await Promise.all([
    db.select({ block: routineLog.block }).from(routineLog).where(and(eq(routineLog.userId, userId), eq(routineLog.day, day))),
    db
      .selectDistinct({ day: routineLog.day })
      .from(routineLog)
      .where(eq(routineLog.userId, userId))
      .orderBy(desc(routineLog.day))
      .limit(366),
  ]);
  return { done: doneRows.map((r) => r.block as BlockId), days: dayRows.map((r) => r.day) };
}

export async function saveRun(db: Database, userId: string, run: RunInput): Promise<void> {
  await db.insert(practiceRuns).values({ userId, songId: run.songId, mode: run.mode, value: run.value, bpm: run.bpm ?? null });
}

/**
 * Saves the answers, replacing earlier ones, and marks the chords they place
 * as learned: from here on they are progress like any other.
 */
export async function saveProfile(db: Database, userId: string, profile: Profile): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(playerProfile)
      .values({ userId, answers: profile })
      .onConflictDoUpdate({ target: playerProfile.userId, set: { answers: profile, updatedAt: new Date() } });
    const chords = placedChords(profile);
    if (chords.length > 0) await tx.insert(chordMastery).values(chords.map((chord) => ({ userId, chord }))).onConflictDoNothing();
  });
}

/**
 * What was practised before signing in joins the account. Bests become runs, so
 * a later query returns the better of the two histories without a merge rule.
 */
export async function importGuestProgress(db: Database, userId: string, guest: GuestProgress): Promise<void> {
  await db.transaction(async (tx) => {
    const chords = Object.keys(guest.learned).filter(isChordId);
    if (chords.length > 0) {
      await tx.insert(chordMastery).values(chords.map((chord) => ({ userId, chord }))).onConflictDoNothing();
    }
    const runs = Object.entries(guest.best).flatMap(([songId, best]) =>
      (["step", "timed"] as const).flatMap((mode) =>
        best?.[mode] === undefined ? [] : [{ userId, songId, mode, value: best[mode] }],
      ),
    );
    if (runs.length > 0) await tx.insert(practiceRuns).values(runs);
    // The guest's answers count only for an account that has none yet.
    if (guest.profile) await tx.insert(playerProfile).values({ userId, answers: guest.profile }).onConflictDoNothing();
  });
}

export async function forgetSong(db: Database, userId: string, songId: string): Promise<void> {
  await db.delete(practiceRuns).where(and(eq(practiceRuns.userId, userId), eq(practiceRuns.songId, songId)));
}

export { EMPTY_PROGRESS };

/**
 * The last six months, for the progress charts. Results are dated by the
 * server's UTC calendar (a run near midnight may land on the next day);
 * routine days are the player's own.
 */
export async function loadHistory(db: Database, userId: string, now = new Date()): Promise<History> {
  const since = new Date(now.getTime() - 183 * 86_400_000);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const [runs, changes, days] = await Promise.all([
    db
      .select({ song: practiceRuns.songId, mode: practiceRuns.mode, value: practiceRuns.value, at: practiceRuns.createdAt })
      .from(practiceRuns)
      .where(and(eq(practiceRuns.userId, userId), gte(practiceRuns.createdAt, since))),
    db
      .select({ pair: changeTests.pair, count: changeTests.count, at: changeTests.createdAt })
      .from(changeTests)
      .where(and(eq(changeTests.userId, userId), gte(changeTests.createdAt, since))),
    db
      .select({ day: routineLog.day, blocks: count() })
      .from(routineLog)
      .where(and(eq(routineLog.userId, userId), gte(routineLog.day, day(since))))
      .groupBy(routineLog.day),
  ]);
  return {
    runs: runs.map((r) => ({ song: r.song, mode: r.mode, value: r.value, day: day(r.at) })),
    changes: changes.map((c) => ({ pair: c.pair, count: c.count, day: day(c.at) })),
    days: days.map((d) => ({ day: d.day, blocks: Number(d.blocks) })),
  };
}

/** Questions asked on the player's day, for the daily limit. */
export async function countQuestions(db: Database, userId: string, day: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(coachMessages)
    .where(and(eq(coachMessages.userId, userId), eq(coachMessages.day, day), eq(coachMessages.kind, "question")));
  return Number(row?.n ?? 0);
}

export async function saveCoachMessage(
  db: Database,
  userId: string,
  message: { kind: "question" | "summary"; day: string; question: string | null; answer: string },
): Promise<void> {
  await db.insert(coachMessages).values({ userId, ...message });
}

/** The newest summary written on or after `since` (a week's Monday), if any. */
export async function latestSummary(db: Database, userId: string, since: string): Promise<string | null> {
  const [row] = await db
    .select({ answer: coachMessages.answer })
    .from(coachMessages)
    .where(and(eq(coachMessages.userId, userId), eq(coachMessages.kind, "summary"), gte(coachMessages.day, since)))
    .orderBy(desc(coachMessages.createdAt))
    .limit(1);
  return row?.answer ?? null;
}

/** The player's recent questions and answers, newest first. */
export async function recentQuestions(db: Database, userId: string, limit = 10): Promise<{ question: string; answer: string; day: string }[]> {
  const rows = await db
    .select({ question: coachMessages.question, answer: coachMessages.answer, day: coachMessages.day })
    .from(coachMessages)
    .where(and(eq(coachMessages.userId, userId), eq(coachMessages.kind, "question")))
    .orderBy(desc(coachMessages.createdAt))
    .limit(limit);
  return rows.map((r) => ({ question: r.question ?? "", answer: r.answer, day: r.day }));
}
