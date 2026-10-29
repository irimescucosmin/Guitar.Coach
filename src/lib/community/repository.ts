import { and, count, desc, eq, inArray, max, sql } from "drizzle-orm";
import { communitySongs, practiceRuns, songReports, user } from "@/db/schema";
import { PASS_SCORE } from "@/lib/music/path";
import type { Database } from "@/lib/progress/repository";
import { COMMUNITY_PREFIX, toSong, type CommunitySong, type CommunitySongInput } from "./song";

/**
 * Community songs in Postgres. Publishing is a fact, not a button: a draft
 * becomes published when its author's own results show a run in time at or
 * above the pass score. Hiding happens when enough players report it.
 */

/** Reports from different players that hide a song until someone looks at it. */
export const REPORTS_TO_HIDE = 3;

const row = {
  id: communitySongs.id,
  title: communitySongs.title,
  kind: communitySongs.kind,
  origin: communitySongs.origin,
  beatsPerBar: communitySongs.beatsPerBar,
  pattern: communitySongs.pattern,
  sections: communitySongs.sections,
  status: communitySongs.status,
  authorId: communitySongs.authorId,
  authorName: user.name,
};

/** Passes in time by players other than the author, per song. */
async function playsOf(db: Database, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ song: practiceRuns.songId, plays: sql<number>`count(distinct ${practiceRuns.userId})` })
    .from(practiceRuns)
    .innerJoin(communitySongs, eq(communitySongs.id, practiceRuns.songId))
    .where(and(inArray(practiceRuns.songId, ids), eq(practiceRuns.mode, "timed"), sql`${practiceRuns.value} >= ${PASS_SCORE}`, sql`${practiceRuns.userId} <> ${communitySongs.authorId}`))
    .groupBy(practiceRuns.songId);
  return new Map(rows.map((r) => [r.song, Number(r.plays)]));
}

async function hydrate(db: Database, rows: Omit<Parameters<typeof toSong>[0], "plays">[]): Promise<CommunitySong[]> {
  const plays = await playsOf(db, rows.map((r) => r.id));
  return rows.map((r) => toSong({ ...r, plays: plays.get(r.id) ?? 0 })).filter((s): s is CommunitySong => s !== null);
}

export async function createCommunitySong(db: Database, authorId: string, input: CommunitySongInput): Promise<string> {
  const id = `${COMMUNITY_PREFIX}${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  await db.insert(communitySongs).values({ id, authorId, ...input });
  return id;
}

export async function updateCommunitySong(db: Database, authorId: string, id: string, input: CommunitySongInput): Promise<boolean> {
  // Only the author, and only while it is a draft: a published song is what others practised.
  const result = await db
    .update(communitySongs)
    .set(input)
    .where(and(eq(communitySongs.id, id), eq(communitySongs.authorId, authorId), eq(communitySongs.status, "draft")))
    .returning({ id: communitySongs.id });
  return result.length > 0;
}

export async function findCommunitySong(db: Database, id: string): Promise<CommunitySong | null> {
  const rows = await db.select(row).from(communitySongs).innerJoin(user, eq(user.id, communitySongs.authorId)).where(eq(communitySongs.id, id));
  const [song] = await hydrate(db, rows);
  return song ?? null;
}

/** Published songs, newest first, plus the caller's own drafts and hidden ones. */
export async function listCommunitySongs(db: Database, viewerId: string): Promise<CommunitySong[]> {
  const rows = await db
    .select(row)
    .from(communitySongs)
    .innerJoin(user, eq(user.id, communitySongs.authorId))
    .where(sql`${communitySongs.status} = 'published' or ${communitySongs.authorId} = ${viewerId}`)
    .orderBy(desc(communitySongs.publishedAt), desc(communitySongs.createdAt));
  return hydrate(db, rows);
}

/**
 * Called after every run in time: a draft whose author just passed it is
 * published. Returns whether this call published it.
 */
export async function publishIfPassed(db: Database, userId: string, songId: string): Promise<boolean> {
  const [best] = await db
    .select({ value: max(practiceRuns.value) })
    .from(practiceRuns)
    .where(and(eq(practiceRuns.userId, userId), eq(practiceRuns.songId, songId), eq(practiceRuns.mode, "timed")));
  if ((best?.value ?? 0) < PASS_SCORE) return false;
  const result = await db
    .update(communitySongs)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(communitySongs.id, songId), eq(communitySongs.authorId, userId), eq(communitySongs.status, "draft")))
    .returning({ id: communitySongs.id });
  return result.length > 0;
}

export async function reportSong(
  db: Database,
  userId: string,
  songId: string,
  reason: "lyrics" | "wrong" | "offensive" | "other",
  note: string | null,
): Promise<{ hidden: boolean }> {
  await db.insert(songReports).values({ songId, userId, reason, note }).onConflictDoNothing();
  const [n] = await db.select({ n: count() }).from(songReports).where(eq(songReports.songId, songId));
  const hidden = Number(n?.n ?? 0) >= REPORTS_TO_HIDE;
  if (hidden) await db.update(communitySongs).set({ status: "hidden" }).where(and(eq(communitySongs.id, songId), eq(communitySongs.status, "published")));
  return { hidden };
}
