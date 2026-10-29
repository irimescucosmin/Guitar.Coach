"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentUser } from "@/lib/auth";
import { importGuestProgress, loadProgress, markLearned, markRoutine, saveChangeTest, saveProfile, saveRun } from "@/lib/progress/repository";
import { loadToday as todayOf, recordPractice, type Today } from "@/lib/progress/practice";
import { blockInput, directMessageInput, messageReportInput, messagingInput, reportInput, answersInput, changeTestInput, chordInput, dayInput, guestProgress, optionalDay, proofInput, questionInput, runInput } from "@/lib/progress/validation";
import { answerQuestion, weeklySummary, type Answer } from "@/lib/coach/service";
import { getLocale } from "next-intl/server";
import { blocksDoneBy, dailyRoutine } from "@/lib/music/routine";
import { NOTE_DRILL_ID } from "@/lib/music/fretboard";
import { earRunAllowed } from "@/lib/music/ear";
import { isCommunityId, communitySongInput, songProblems } from "@/lib/community/song";
import { markNotificationsRead, notifyOnce, notifyPassed, reportMessage, sendMessage, setAcceptsMessages, setBlocked, type SendResult } from "@/lib/social/repository";
import { createCommunitySong, findCommunitySong, publishIfPassed, reportSong, updateCommunitySong } from "@/lib/community/repository";
import { isChordId } from "@/lib/music/chords";
import { PASS_SCORE, type Progress } from "@/lib/music/path";

/**
 * Thin on purpose: check who is calling, validate, delegate to src/lib.
 * Results carry the player's date: the server ticks today's routine from them.
 */

type Saved = { saved: true; progress: Progress; today: Today | null } | { saved: false };

export async function saveLearnedChord(input: unknown, day: unknown = null): Promise<Saved> {
  const me = await currentUser();
  const parsed = chordInput.safeParse(input);
  if (!me || !parsed.success || !isChordId(parsed.data)) return { saved: false };
  const chord = parsed.data;
  const result = await recordPractice(db, me.id, optionalDay.parse(day), { kind: "learn", chord }, () => markLearned(db, me.id, chord));
  revalidatePath("/", "layout");
  return result ? { saved: true, ...result } : { saved: false };
}

export async function savePracticeRun(run: unknown, day: unknown = null): Promise<Saved> {
  const me = await currentUser();
  const parsed = runInput.safeParse(run);
  if (!me || !parsed.success) return { saved: false };
  const r = parsed.data;
  // A community song must exist and be visible to this player: a result on a made-up id is refused.
  if (isCommunityId(r.songId)) {
    const song = await findCommunitySong(db, r.songId);
    if (!song || (song.status !== "published" && song.authorId !== me.id)) return { saved: false };
  }
  const event = { kind: "run" as const, song: r.songId, mode: r.songId === NOTE_DRILL_ID ? ("notes" as const) : r.mode, value: r.value };
  const result = await recordPractice(db, me.id, optionalDay.parse(day), event, () => saveRun(db, me.id, r), (before) =>
    earRunAllowed(before, r.songId),
  );
  // The author passing their own draft in time, with this very run, is what publishes it; anyone else passing it is news for the author.
  if (result && isCommunityId(r.songId) && r.mode === "timed" && r.value >= PASS_SCORE) {
    const song = await findCommunitySong(db, r.songId);
    if (song && song.authorId === me.id) {
      if (await publishIfPassed(db, me.id, r.songId)) await notifyOnce(db, me.id, "songPublished", { songId: song.id, title: song.title }, "songId");
    } else if (song) {
      await notifyPassed(db, song.authorId, { songId: song.id, title: song.title, by: me.name });
    }
  }
  revalidatePath("/", "layout");
  return result ? { saved: true, ...result } : { saved: false };
}

export async function importGuest(progress: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = guestProgress.safeParse(progress);
  if (!me || !parsed.success) return { saved: false };
  await importGuestProgress(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id), today: null };
}

export async function saveAnswers(profile: unknown): Promise<Saved> {
  const me = await currentUser();
  const parsed = answersInput.safeParse(profile);
  if (!me || !parsed.success) return { saved: false };
  await saveProfile(db, me.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, progress: await loadProgress(db, me.id), today: null };
}

export async function saveChanges(input: unknown, day: unknown = null): Promise<Saved> {
  const me = await currentUser();
  const parsed = changeTestInput.safeParse(input);
  if (!me || !parsed.success) return { saved: false };
  const { pair, count } = parsed.data;
  const result = await recordPractice(db, me.id, optionalDay.parse(day), { kind: "changes", pair }, () => saveChangeTest(db, me.id, pair, count));
  return result ? { saved: true, ...result } : { saved: false };
}

export async function loadToday(day: unknown): Promise<Today | null> {
  const me = await currentUser();
  const parsed = dayInput.safeParse(day);
  if (!me || !parsed.success) return null;
  return todayOf(db, me.id, parsed.data);
}

/** The microphone in the browser proved tuning or the warm-up: tick the block it belongs to, if today has it. */
export async function reportProof(input: unknown): Promise<Today | null> {
  const me = await currentUser();
  const parsed = proofInput.safeParse(input);
  if (!me || !parsed.success) return null;
  const { day, proof } = parsed.data;
  const blocks = blocksDoneBy(dailyRoutine(await loadProgress(db, me.id), day), { kind: proof });
  if (blocks.length > 0) await markRoutine(db, me.id, day, blocks);
  return todayOf(db, me.id, day);
}

export async function askTeacher(input: unknown): Promise<Answer> {
  const me = await currentUser();
  const parsed = questionInput.safeParse(input);
  if (!me || !parsed.success) return { ok: false, reason: "failed" };
  return answerQuestion(db, me.id, await getLocale(), parsed.data.day, parsed.data.question);
}

export async function loadWeeklySummary(day: unknown): Promise<string | null> {
  const me = await currentUser();
  const parsed = dayInput.safeParse(day);
  if (!me || !parsed.success) return null;
  return weeklySummary(db, me.id, await getLocale(), parsed.data);
}

export async function saveCommunitySong(input: unknown, id: unknown = null): Promise<{ ok: true; id: string } | { ok: false }> {
  const me = await currentUser();
  const parsed = communitySongInput.safeParse(input);
  if (!me || !parsed.success || songProblems(parsed.data).length > 0) return { ok: false };
  if (typeof id === "string" && isCommunityId(id)) {
    const updated = await updateCommunitySong(db, me.id, id, parsed.data);
    return updated ? { ok: true, id } : { ok: false };
  }
  return { ok: true, id: await createCommunitySong(db, me.id, parsed.data) };
}

export async function reportCommunitySong(input: unknown): Promise<{ hidden: boolean } | null> {
  const me = await currentUser();
  const parsed = reportInput.safeParse(input);
  if (!me || !parsed.success) return null;
  const song = await findCommunitySong(db, parsed.data.songId);
  if (!song || song.authorId === me.id) return null;
  const result = await reportSong(db, me.id, parsed.data.songId, parsed.data.reason, parsed.data.note ?? null);
  if (result.hidden) await notifyOnce(db, song.authorId, "songHidden", { songId: song.id, title: song.title }, "songId");
  revalidatePath("/songs");
  return result;
}

/* ---------- talking to other players ---------- */

export async function sendDirectMessage(input: unknown): Promise<SendResult> {
  const me = await currentUser();
  const parsed = directMessageInput.safeParse(input);
  if (!me || !parsed.success) return { ok: false, reason: "empty" };
  const result = await sendMessage(db, me.id, parsed.data.to, me.name, parsed.data.body);
  revalidatePath("/messages");
  return result;
}

export async function reportDirectMessage(input: unknown): Promise<{ hidden: boolean } | null> {
  const me = await currentUser();
  const parsed = messageReportInput.safeParse(input);
  if (!me || !parsed.success) return null;
  const result = await reportMessage(db, me.id, parsed.data.messageId, parsed.data.reason);
  revalidatePath("/messages");
  return result;
}

export async function blockPlayer(input: unknown): Promise<boolean> {
  const me = await currentUser();
  const parsed = blockInput.safeParse(input);
  if (!me || !parsed.success || parsed.data.userId === me.id) return false;
  await setBlocked(db, me.id, parsed.data.userId, parsed.data.blocked);
  revalidatePath("/messages");
  return true;
}

export async function setMessaging(input: unknown): Promise<boolean> {
  const me = await currentUser();
  const parsed = messagingInput.safeParse(input);
  if (!me || !parsed.success) return false;
  await setAcceptsMessages(db, me.id, parsed.data.accepts);
  revalidatePath("/messages");
  return true;
}

/** Opening the bell reads everything in it. */
export async function readNotifications(): Promise<boolean> {
  const me = await currentUser();
  if (!me) return false;
  await markNotificationsRead(db, me.id);
  revalidatePath("/", "layout");
  return true;
}
