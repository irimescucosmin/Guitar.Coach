import { blocksDoneBy, dailyRoutine, streak, type BlockId, type PracticeEvent } from "@/lib/music/routine";
import type { Progress } from "@/lib/music/path";
import { loadProgress, loadRoutine, markRoutine, type Database } from "./repository";

export type Today = { done: BlockId[]; streak: number };

/**
 * Saves a result and ticks the routine blocks it proves, in one place on the
 * server. The plan is the one the player saw today, built from the progress
 * before this result: a block is done because a result was saved, never because
 * the browser said so.
 */
export async function recordPractice(
  db: Database,
  userId: string,
  day: string | null,
  event: PracticeEvent,
  save: () => Promise<void>,
): Promise<{ progress: Progress; today: Today | null }> {
  const before = day ? await loadProgress(db, userId) : null;
  await save();
  let today: Today | null = null;
  if (day && before) {
    const blocks = blocksDoneBy(dailyRoutine(before, day), event);
    if (blocks.length > 0) await markRoutine(db, userId, day, blocks);
    today = await loadToday(db, userId, day);
  }
  return { progress: await loadProgress(db, userId), today };
}

export async function loadToday(db: Database, userId: string, day: string): Promise<Today> {
  const { done, days } = await loadRoutine(db, userId, day);
  return { done, streak: streak(days, day) };
}
