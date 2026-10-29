import type { ChordId } from "@/lib/music/chords";
import { matchChord, silentStrings, type ChordMatch } from "./detect";

/**
 * A chord is judged on a strum, never on the air between two strums.
 *
 * The literature agrees with the ear: chord labels belong to strumming
 * events (Joint Transcription of Acoustic Guitar Strumming, 2025, labels
 * chords only at onsets; Essentia's ChordsDetection averages a window of
 * chroma rather than reading one frame). Judging every frame did three wrong
 * things: it read the decaying tail as "the G# is missing", it read the
 * fingers moving between two chords as a wrong chord, and it read the room
 * as a chord with notes missing.
 *
 * So: an onset opens a window; the chroma of the window's frames is averaged
 * and judged once, when the window closes (after WINDOW_MS, or earlier when
 * the sound has decayed to a fraction of its peak); frames with the app's
 * own guitar in the room, or too quiet, or that do not sound like a chord at
 * all, give no verdict. Pure, so every rule here has a test.
 */

/** How long after the onset the strum is listened to: the chord is clearest right after the pick. */
export const WINDOW_MS = 450;
/** A strum that has decayed below this share of its peak is a tail, not a chord. */
export const DECAY_SHARE = 0.3;
/** Frames needed before a verdict: fewer is a click or a knock, not a strum. */
export const MIN_FRAMES = 4;
/** Below this resemblance to any chord the sound is the room, not the guitar: no verdict. */
export const TONAL_MIN = 0.6;

export interface JudgeFrame {
  now: number;
  level: number;
  attack: boolean;
  chroma: ArrayLike<number>;
  spectrum: ArrayLike<number>;
  sampleRate: number;
  fftSize: number;
  /** The app's own guitar is sounding: whatever the microphone hears now proves nothing. */
  ownSound: boolean;
}

export type Verdict = { kind: "strum"; match: ChordMatch; at: number } | { kind: "noise"; at: number };

interface Window {
  openedAt: number;
  peak: number;
  frames: number;
  sum: Float32Array;
  /** The spectrum at the loudest frame: where every string's fundamental is best seen. */
  loudest: Float32Array;
  loudestLevel: number;
  sampleRate: number;
  fftSize: number;
  spoiled: boolean;
}

export class StrumJudge {
  private window: Window | null = null;

  /** Feed every frame; a verdict comes back at most once per strum. */
  feed(frame: JudgeFrame, target: ChordId, silence: number): Verdict | null {
    if (frame.attack) {
      // A new strum while a window is open: judge what there is, then start over.
      const pending = this.window && this.window.frames >= MIN_FRAMES ? this.close(this.window, target) : null;
      this.window = {
        openedAt: frame.now, peak: frame.level, frames: 0, sum: new Float32Array(12),
        loudest: new Float32Array(0), loudestLevel: 0, sampleRate: frame.sampleRate, fftSize: frame.fftSize, spoiled: false,
      };
      if (pending) return pending;
    }
    const w = this.window;
    if (!w) return null;
    if (frame.ownSound) w.spoiled = true;
    if (frame.level < silence) {
      // Silence straight after the onset is a knock, not a strum.
      return this.finish(target);
    }
    w.peak = Math.max(w.peak, frame.level);
    if (frame.level > w.loudestLevel) {
      w.loudestLevel = frame.level;
      w.loudest = Float32Array.from(frame.spectrum as ArrayLike<number>);
    }
    for (let i = 0; i < 12; i++) w.sum[i]! += frame.chroma[i]!;
    w.frames += 1;
    const decayed = frame.level < w.peak * DECAY_SHARE;
    if (frame.now - w.openedAt >= WINDOW_MS || decayed) return this.finish(target);
    return null;
  }

  /** The chord the target changes to: whatever strum is half-heard belongs to the old one. */
  reset(): void {
    this.window = null;
  }

  private finish(target: ChordId): Verdict | null {
    const w = this.window;
    this.window = null;
    if (!w || w.spoiled || w.frames < MIN_FRAMES) return null;
    return this.close(w, target);
  }

  private close(w: Window, target: ChordId): Verdict {
    const chroma = new Float32Array(12);
    let max = 0;
    for (let i = 0; i < 12; i++) max = Math.max(max, w.sum[i]!);
    if (max > 0) for (let i = 0; i < 12; i++) chroma[i] = w.sum[i]! / max;
    const silent = w.loudest.length > 0 ? silentStrings(w.loudest, w.sampleRate, w.fftSize, target) : [];
    const match = matchChord(chroma, target, silent);
    if (match.bestScore < TONAL_MIN) return { kind: "noise", at: w.openedAt };
    return { kind: "strum", match, at: w.openedAt };
  }
}
