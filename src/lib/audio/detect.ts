import { CHORDS, CHORD_IDS, type ChordId } from "@/lib/music/chords";

/**
 * Pure signal analysis: no Web Audio here, so every rule is testable with a
 * synthetic spectrum. The microphone wrapper feeds these functions.
 */

/** Below the low E (82 Hz) there is only hum; above ~1.1 kHz harmonics blur the chord. */
export const ANALYSIS_LOW_HZ = 75;
export const ANALYSIS_HIGH_HZ = 1100;
/** Peaks quieter than the loudest by more than this are noise. */
const PEAK_FLOOR_DB = 30;

export function midiFromFrequency(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function frequencyFromMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Folds the spectral peaks into 12 pitch classes, weighted by loudness and
 * normalised so the loudest class is 1.
 *
 * @param spectrumDb magnitude in dB per bin, as `AnalyserNode.getFloatFrequencyData` returns it
 */
export function chromaFromSpectrum(spectrumDb: ArrayLike<number>, sampleRate: number, fftSize: number): Float32Array {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(1, Math.floor(ANALYSIS_LOW_HZ / binHz));
  const hi = Math.min(spectrumDb.length - 2, Math.ceil(ANALYSIS_HIGH_HZ / binHz));
  let maxDb = -Infinity;
  for (let i = lo; i <= hi; i++) maxDb = Math.max(maxDb, spectrumDb[i]!);
  const chroma = new Float32Array(12);
  if (!Number.isFinite(maxDb)) return chroma;

  const peaks: { hz: number; amplitude: number }[] = [];
  for (let i = lo; i <= hi; i++) {
    const a = spectrumDb[i - 1]!;
    const b = spectrumDb[i]!;
    const c = spectrumDb[i + 1]!;
    if (b < maxDb - PEAK_FLOOR_DB || b < a || b < c) continue;
    // A parabola through the three bins finds the peak between them.
    const denominator = a - 2 * b + c;
    const offset = denominator === 0 ? 0 : (0.5 * (a - c)) / denominator;
    peaks.push({ hz: (i + offset) * binHz, amplitude: 10 ** ((b - maxDb) / 20) });
  }

  for (const peak of peaks) {
    const midi = midiFromFrequency(peak.hz);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pitchClass]! += peak.amplitude * harmonicWeight(peak, peaks);
  }

  let max = 0;
  for (const v of chroma) max = Math.max(max, v);
  if (max > 0) for (let i = 0; i < 12; i++) chroma[i]! /= max;
  return chroma;
}

/**
 * The 5th and 7th harmonics of a string land on pitch classes that are not its
 * own: the 5th of a low E is a G#, which turns an Em into an E. When a peak sits
 * where a lower peak puts its 5th or 7th harmonic, it counts for little: on a
 * steel string the low fundamentals are often quieter than their harmonics.
 * Octaves (2, 4) and fifths (3, 6) belong to the chord anyway and are kept.
 */
function harmonicWeight(peak: { hz: number; amplitude: number }, peaks: readonly { hz: number; amplitude: number }[]): number {
  for (const k of [5, 7]) {
    const root = peak.hz / k;
    const tolerance = root * 0.02;
    if (peaks.some((p) => Math.abs(p.hz - root) < tolerance)) return 0.1;
  }
  return 1;
}

/**
 * A string whose fundamental is not a harmonic of a lower played string can
 * be checked on its own: if there is no peak near it, the string did not
 * sound, whatever the chroma says. A fundamental sitting on a harmonic of a
 * lower string (the open G of a G chord is the octave of its bass) cannot be
 * told from that harmonic and gets the benefit of the doubt.
 */
export function checkableStrings(chord: ChordId): number[] {
  const notes = CHORDS[chord].notes;
  return notes.flatMap((midi, string) => {
    if (midi === null) return [];
    const hz = frequencyFromMidi(midi);
    const covered = notes.slice(0, string).some((lower) => {
      if (lower === null) return false;
      const ratio = hz / frequencyFromMidi(lower);
      const k = Math.round(ratio);
      return k >= 2 && k <= 8 && Math.abs(ratio - k) < 0.03 * k;
    });
    return covered ? [] : [string];
  });
}

/** A checkable string this far below the loudest peak did not sound: on a strum every fundamental is within a few tens of dB of the loudest. */
export const SILENT_BELOW_DB = 45;

/** The chord's strings, among the checkable ones, with no peak at their fundamental. */
export function silentStrings(spectrumDb: ArrayLike<number>, sampleRate: number, fftSize: number, chord: ChordId): number[] {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(1, Math.floor(ANALYSIS_LOW_HZ / binHz));
  const hi = Math.min(spectrumDb.length - 2, Math.ceil(ANALYSIS_HIGH_HZ / binHz));
  let maxDb = -Infinity;
  for (let i = lo; i <= hi; i++) maxDb = Math.max(maxDb, spectrumDb[i]!);
  if (!Number.isFinite(maxDb)) return checkableStrings(chord);
  const notes = CHORDS[chord].notes;
  return checkableStrings(chord).filter((string) => {
    const hz = frequencyFromMidi(notes[string]!);
    const from = Math.max(lo, Math.floor((hz * 0.97) / binHz));
    const to = Math.min(hi, Math.ceil((hz * 1.03) / binHz));
    let peak = -Infinity;
    for (let i = from; i <= to; i++) peak = Math.max(peak, spectrumDb[i]!);
    return peak < maxDb - SILENT_BELOW_DB;
  });
}

export interface ChordMatch {
  /** The chord the sound resembles most. */
  best: ChordId;
  /** Cosine similarity of the sound with `best`, 0 to 1. */
  bestScore: number;
  /** Pitch classes of the target that are too quiet: a muted or missing string. */
  missing: number[];
  /** Loud pitch classes the target does not have: a wrong finger or a touched string. */
  extra: number[];
  /** Strings of the target that did not sound at all, when a spectrum was given. */
  silent: number[];
  /** The target is what is playing, with all its notes and all its strings. */
  clean: boolean;
}

const MISSING_BELOW = 0.12;
const EXTRA_ABOVE = 0.5;
const CLEAN_SCORE = 0.72;

function similarity(chroma: ArrayLike<number>, chord: ChordId): number {
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += chroma[i]! ** 2;
  if (norm === 0) return 0;
  const pcs = CHORDS[chord].pitchClasses;
  const dot = pcs.reduce((sum, pc) => sum + chroma[pc]!, 0);
  return dot / (Math.sqrt(norm) * Math.sqrt(pcs.length));
}

export function matchChord(chroma: ArrayLike<number>, target: ChordId, silent: readonly number[] = []): ChordMatch {
  let best: ChordId = target;
  let bestScore = -1;
  for (const id of CHORD_IDS) {
    const score = similarity(chroma, id);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  const pcs = CHORDS[target].pitchClasses;
  const missing = pcs.filter((pc) => chroma[pc]! < MISSING_BELOW);
  const extra: number[] = [];
  for (let pc = 0; pc < 12; pc++) if (!pcs.includes(pc) && chroma[pc]! >= EXTRA_ABOVE) extra.push(pc);
  return { best, bestScore, missing, extra, silent: [...silent], clean: best === target && missing.length === 0 && silent.length === 0 && bestScore > CLEAN_SCORE };
}

/** What the microphone wrapper hands over each frame; a plain shape, so this file stays free of Web Audio. */
export interface Heard {
  chroma: ArrayLike<number>;
  spectrum: ArrayLike<number>;
  sampleRate: number;
  fftSize: number;
}

/** The full verdict on a frame: the chord by its notes, and every checkable string by its own peak. */
export function matchHeard(heard: Heard, target: ChordId): ChordMatch {
  return matchChord(heard.chroma, target, silentStrings(heard.spectrum, heard.sampleRate, heard.fftSize, target));
}

/** Exponential smoothing so one noisy frame does not flip the verdict. */
export function smoothChroma(previous: Float32Array, next: Float32Array, keep = 0.55): Float32Array {
  const out = new Float32Array(12);
  for (let i = 0; i < 12; i++) out[i] = previous[i]! * keep + next[i]! * (1 - keep);
  return out;
}

export function rms(samples: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! ** 2;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/**
 * Fundamental frequency of a single note by autocorrelation, or null when the
 * signal is too quiet or has no clear period between 70 Hz and `maxHz`. The
 * tuner needs only open strings (up to 330 Hz); finding notes goes higher.
 */
export function pitchFromSamples(samples: ArrayLike<number>, sampleRate: number, maxHz = 400): number | null {
  if (rms(samples) < 0.01) return null;
  const n = Math.min(samples.length, 4096);
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.ceil(sampleRate / 70);
  if (maxLag + 1 >= n) return null;
  const corr = new Float64Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += samples[i]! * samples[i + lag]!;
    corr[lag] = s;
  }
  // The first strong local maximum is the period; later ones are its multiples.
  let globalMax = 0;
  for (let lag = minLag + 1; lag <= maxLag; lag++) globalMax = Math.max(globalMax, corr[lag]!);
  let bestLag = -1;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (corr[lag]! > corr[lag - 1]! && corr[lag]! >= corr[lag + 1]! && corr[lag]! > 0.9 * globalMax) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 0) return null;
  const a = corr[bestLag - 1]!;
  const b = corr[bestLag]!;
  const c = corr[bestLag + 1]!;
  const denominator = a - 2 * b + c;
  const shift = denominator === 0 ? 0 : (0.5 * (a - c)) / denominator;
  return sampleRate / (bestLag + shift);
}

export const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] as const;

export interface TuningReading {
  /** 0 = 6th string (low E). */
  string: number;
  cents: number;
}

export function readTuning(hz: number): TuningReading {
  let string = 0;
  let distance = Infinity;
  STANDARD_TUNING_MIDI.forEach((midi, i) => {
    const d = Math.abs(midiFromFrequency(hz) - midi);
    if (d < distance) {
      distance = d;
      string = i;
    }
  });
  const cents = Math.round(1200 * Math.log2(hz / frequencyFromMidi(STANDARD_TUNING_MIDI[string]!)));
  return { string, cents };
}
