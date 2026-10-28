import { z } from "zod";
import { CHORD_IDS, isChordId } from "@/lib/music/chords";
import type { Progress } from "@/lib/music/path";
import { SONGS } from "@/lib/music/songs";

/**
 * What arrives from a browser is checked against the catalogue, never trusted:
 * a song id the app does not know would become a row nobody can read.
 */

const songId = z.enum(SONGS.map((s) => s.id) as [string, ...string[]]);
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

const knownChords = new Set<string>(CHORD_IDS);
const knownSongs = new Set<string>(SONGS.map((s) => s.id));
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
  })
  .transform((g) => ({ learned: pick(g.learned, knownChords), best: pick(g.best, knownSongs) }));
export type GuestProgress = z.infer<typeof guestProgress>;

/** The validated shape, with chord keys narrowed back to chord ids. */
export function toProgress(guest: GuestProgress): Progress {
  const learned: Progress["learned"] = {};
  for (const key of Object.keys(guest.learned)) if (isChordId(key)) learned[key] = true;
  return { learned, best: guest.best };
}
