import { and, eq, max, min } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { isChordId } from "@/lib/music/chords";
import { EMPTY_PROGRESS, type Progress } from "@/lib/music/path";
import * as schema from "@/db/schema";
import { chordMastery, practiceRuns } from "@/db/schema";
import type { GuestProgress, RunInput } from "./validation";

/**
 * Progress in Postgres. Takes the database as an argument so the same code runs
 * against the app's pool and against the test database.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export async function loadProgress(db: Database, userId: string): Promise<Progress> {
  const [learnedRows, bestRows] = await Promise.all([
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
  ]);

  const progress: Progress = { learned: {}, best: {} };
  for (const { chord } of learnedRows) if (isChordId(chord)) progress.learned[chord] = true;
  for (const row of bestRows) {
    const value = row.mode === "step" ? row.fastest : row.highest;
    if (value === null) continue;
    progress.best[row.songId] = { ...progress.best[row.songId], [row.mode]: value };
  }
  return progress;
}

export async function markLearned(db: Database, userId: string, chord: string): Promise<void> {
  await db.insert(chordMastery).values({ userId, chord }).onConflictDoNothing();
}

export async function saveRun(db: Database, userId: string, run: RunInput): Promise<void> {
  await db.insert(practiceRuns).values({ userId, songId: run.songId, mode: run.mode, value: run.value, bpm: run.bpm ?? null });
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
        best[mode] === undefined ? [] : [{ userId, songId, mode, value: best[mode] }],
      ),
    );
    if (runs.length > 0) await tx.insert(practiceRuns).values(runs);
  });
}

export async function forgetSong(db: Database, userId: string, songId: string): Promise<void> {
  await db.delete(practiceRuns).where(and(eq(practiceRuns.userId, userId), eq(practiceRuns.songId, songId)));
}

export { EMPTY_PROGRESS };
