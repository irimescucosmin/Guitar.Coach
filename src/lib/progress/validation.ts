import { z } from "zod";
import { CHORD_IDS, isChordId } from "@/lib/music/chords";
import type { Progress } from "@/lib/music/path";
import { NOTE_DRILL_ID } from "@/lib/music/fretboard";
import { EXPERIENCE, GOALS, GUITARS, MINUTES, STYLES, TAB_READING, type Profile } from "@/lib/music/profile";
import { SONGS } from "@/lib/music/songs";

/**
 * What arrives from a browser is checked against the catalogue, never trusted:
 * a song id the app does not know would become a row nobody can read.
 */

/** Songs, plus the exercises that record results the same way (lesson 0). */
const PRACTICE_IDS = [...SONGS.map((s) => s.id), NOTE_DRILL_ID];
const songId = z.enum(PRACTICE_IDS as [string, ...string[]]);
const chordId = z.enum(CHORD_IDS as [string, ...string[]]);

/** One hour per change is already absurd; it only stops garbage. */
const stepMs = z.number().positive().max(3_600_000);
const share = z.number().min(0).max(1);

export const runInput = z.discriminatedUnion("mode", [
  z.object({ songId, mode: z.literal("step"), value: stepMs, bpm: z.number().int().min(40).max(200).optional() }),
  z.object({ songId, mode: z.literal("timed"), value: share, bpm: z.number().int().min(40).max(200).optional() }),
]);
export type RunInput = z.infer<typeof runInput>;

export const chordInput = chordId;

/** Chord lists keep only chords the app knows, once each. */
const chordList = z
  .array(z.string())
  .max(50)
  .transform((list) => [...new Set(list.filter(isChordId))]);

export const profileInput = z.object({
  experience: z.enum(EXPERIENCE),
  knowsOpenStrings: z.boolean(),
  knownChords: chordList,
  verifiedChords: chordList,
  checked: z.boolean(),
  readsTab: z.enum(TAB_READING),
  guitar: z.enum(GUITARS),
  minutes: z.union(MINUTES.map((m) => z.literal(m)) as [z.ZodLiteral<10>, z.ZodLiteral<20>, z.ZodLiteral<30>]),
  style: z.enum(STYLES),
  goal: z.enum(GOALS),
  takenAt: z.iso.datetime(),
}) satisfies z.ZodType<Profile, unknown>;

const knownChords = new Set<string>(CHORD_IDS);
const knownSongs = new Set<string>(PRACTICE_IDS);
const pick = <T,>(record: Record<string, T>, known: Set<string>) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => known.has(key)));

/**
 * Keys the catalogue no longer knows (a renamed song, a removed chord) are
 * dropped, not refused: refusing would throw away everything else the guest did.
 */
export const guestProgress = z
  .object({
    learned: z.record(z.string(), z.literal(true)),
    best: z.record(z.string(), z.object({ step: stepMs.optional(), timed: share.optional() })),
    // A broken or outdated profile is dropped, not a reason to refuse the rest.
    profile: profileInput.optional().catch(undefined),
  })
  .transform((g): { learned: Record<string, true>; best: Progress["best"]; profile?: Profile } => ({
    learned: pick(g.learned, knownChords),
    best: pick(g.best, knownSongs),
    ...(g.profile ? { profile: g.profile } : {}),
  }));
export type GuestProgress = z.infer<typeof guestProgress>;

/** The validated shape, with chord keys narrowed back to chord ids. */
export function toProgress(guest: GuestProgress): Progress {
  const learned: Progress["learned"] = {};
  for (const key of Object.keys(guest.learned)) if (isChordId(key)) learned[key] = true;
  return guest.profile ? { learned, best: guest.best, profile: guest.profile } : { learned, best: guest.best };
}
