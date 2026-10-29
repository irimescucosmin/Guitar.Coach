import { z } from "zod";
import { CHORD_IDS, isChordId } from "@/lib/music/chords";
import type { Progress } from "@/lib/music/path";
import { EAR_IDS } from "@/lib/music/ear";
import { NOTE_DRILL_ID } from "@/lib/music/fretboard";
import { EXPERIENCE, GOALS, GUITARS, MINUTES, STYLES, TAB_READING, type Profile } from "@/lib/music/profile";
import { PAIR_KEYS, isNearToday } from "@/lib/music/routine";
import { QUESTION_MAX_CHARS } from "@/lib/coach/context";
import { SONGS } from "@/lib/music/songs";

/**
 * What arrives from a browser is checked against the catalogue, never trusted:
 * a song id the app does not know would become a row nobody can read.
 */

/**
 * Songs, plus the exercises that record results the same way: lesson 0 (step:
 * ms per note) and the ear levels (timed: share of right answers).
 */
const PRACTICE_IDS = [...SONGS.map((s) => s.id), NOTE_DRILL_ID, ...EAR_IDS];
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

const profileShape = z.object({
  experience: z.enum(EXPERIENCE),
  knowsOpenStrings: z.boolean(),
  openStringsHeard: z.boolean().optional(),
  knownChords: chordList,
  verifiedChords: chordList,
  checked: z.boolean(),
  readsTab: z.enum(TAB_READING),
  guitar: z.enum(GUITARS),
  minutes: z.union(MINUTES.map((m) => z.literal(m)) as [z.ZodLiteral<10>, z.ZodLiteral<20>, z.ZodLiteral<30>]),
  style: z.enum(STYLES),
  goal: z.enum(GOALS),
  takenAt: z.iso.datetime(),
});

/**
 * The answers, narrowed to what can be true: open strings heard only by someone
 * who said they know them, chords heard only among the declared ones.
 * Answers saved before the open-string check existed keep what they placed
 * then: "I know them" moved the player past lesson 0, and still does.
 */
const narrow = (p: z.infer<typeof profileShape>): Profile => ({
  ...p,
  openStringsHeard: p.knowsOpenStrings && (p.openStringsHeard ?? true),
  verifiedChords: p.verifiedChords.filter((c) => p.knownChords.includes(c)),
});
export const profileInput = profileShape.transform(narrow);

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

/** One minute of changes: more than 200 clean changes is not a guitar. */
export const changeTestInput = z.object({
  pair: z.enum(PAIR_KEYS as [string, ...string[]]),
  count: z.number().int().min(0).max(200),
});
export type ChangeTestInput = z.infer<typeof changeTestInput>;

/** The player's local day, close to the server's. */
export const dayInput = z.string().refine((d) => isNearToday(d, new Date()), "not today");

/** What the browser can report on its own: only what its microphone proved. */
export const proofInput = z.object({ day: dayInput, proof: z.enum(["tuned", "warmup"]) });

/** Today's date travels with every result, so the server can tick the routine. */
export const optionalDay = dayInput.nullable().catch(null);

/** New answers from the questionnaire: the open-string check result must be there. */
export const answersInput = profileShape.extend({ openStringsHeard: z.boolean() }).transform(narrow);

/** A question for the teacher: short, on the player's day. */
export const questionInput = z.object({ day: dayInput, question: z.string().trim().min(2).max(QUESTION_MAX_CHARS) });
