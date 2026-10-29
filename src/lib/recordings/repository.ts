import { and, desc, eq, notInArray } from "drizzle-orm";
import { recordings } from "@/db/schema";
import { KEEP_WEEKS, mondayOf, type RecordingInfo } from "@/lib/music/recordings";
import type { Database } from "@/lib/progress/repository";

export interface NewRecording {
  songId: string;
  mode: "step" | "timed";
  share: number | null;
  day: string;
  durationMs: number;
  mime: string;
  audio: Buffer;
}

const info = {
  id: recordings.id,
  song: recordings.songId,
  mode: recordings.mode,
  share: recordings.share,
  week: recordings.week,
  day: recordings.day,
  durationMs: recordings.durationMs,
};

/**
 * Saves the week's recording, replacing the one already there for that week,
 * and drops what is older than KEEP_WEEKS weeks. Returns the new id.
 */
export async function saveRecording(db: Database, userId: string, input: NewRecording): Promise<string> {
  const week = mondayOf(input.day);
  return db.transaction(async (tx) => {
    await tx.delete(recordings).where(and(eq(recordings.userId, userId), eq(recordings.week, week)));
    const [row] = await tx
      .insert(recordings)
      .values({ userId, week, songId: input.songId, mode: input.mode, share: input.share, day: input.day, durationMs: input.durationMs, mime: input.mime, audio: input.audio })
      .returning({ id: recordings.id });
    const keep = await tx
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .orderBy(desc(recordings.week))
      .limit(KEEP_WEEKS);
    await tx.delete(recordings).where(and(eq(recordings.userId, userId), notInArray(recordings.id, keep.map((k) => k.id))));
    return row!.id;
  });
}

/** The player's recordings, without the audio, newest first. */
export async function listRecordings(db: Database, userId: string): Promise<RecordingInfo[]> {
  return db.select(info).from(recordings).where(eq(recordings.userId, userId)).orderBy(desc(recordings.week), desc(recordings.day));
}

/** The audio of one recording, for its owner only. */
export async function readRecording(db: Database, userId: string, id: string): Promise<{ mime: string; audio: Buffer } | null> {
  const [row] = await db
    .select({ mime: recordings.mime, audio: recordings.audio })
    .from(recordings)
    .where(and(eq(recordings.id, id), eq(recordings.userId, userId)));
  return row ?? null;
}
