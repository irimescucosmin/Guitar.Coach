import { describe, expect, it } from "vitest";
import { CHORDS, CHORD_IDS, type ChordId } from "@/lib/music/chords";
import { fixFor } from "@/lib/music/feedback";
import {
  OnsetDetector,
  checkableStrings,
  chromaFromSpectrum,
  frequencyFromMidi,
  matchChord,
  matchHeard,
  pitchFromSamples,
  readTuning,
} from "./detect";

const SAMPLE_RATE = 48_000;
const FFT = 16_384;

/** A spectrum in dB with a peak, plus two weaker harmonics, for every MIDI note given. */
function spectrumOf(notes: number[], quietNotes: number[] = []): Float32Array {
  const bins = new Float32Array(FFT / 2).fill(-110);
  const binHz = SAMPLE_RATE / FFT;
  const add = (hz: number, db: number) => {
    const i = Math.round(hz / binHz);
    if (i <= 0 || i >= bins.length - 1) return;
    bins[i] = Math.max(bins[i]!, db);
    bins[i - 1] = Math.max(bins[i - 1]!, db - 9);
    bins[i + 1] = Math.max(bins[i + 1]!, db - 9);
  };
  for (const n of notes) {
    const f = frequencyFromMidi(n);
    add(f, -20);
    add(2 * f, -26);
    add(3 * f, -30);
    add(4 * f, -32);
    // The 5th harmonic is a major third: the one that turns a minor chord major.
    add(5 * f, -30);
    add(6 * f, -36);
  }
  for (const n of quietNotes) add(frequencyFromMidi(n), -60);
  return bins;
}

const played = (id: ChordId) => CHORDS[id].notes.filter((n): n is number => n !== null);

describe("chord recognition", () => {
  it.each(CHORD_IDS)("recognises %s played cleanly", (id) => {
    const chroma = chromaFromSpectrum(spectrumOf(played(id)), SAMPLE_RATE, FFT);
    const match = matchChord(chroma, id);
    expect(match.best).toBe(id);
    expect(match.clean).toBe(true);
  });

  it("names the missing note when a string is muted", () => {
    // Em without the open G string: the only G in the chord.
    const notes = played("Em").filter((n) => n % 12 !== 7);
    const match = matchChord(chromaFromSpectrum(spectrumOf(notes), SAMPLE_RATE, FFT), "Em");
    expect(match.clean).toBe(false);
    expect(match.missing).toEqual([7]);
  });

  it("does not accept a different chord", () => {
    const chroma = chromaFromSpectrum(spectrumOf(played("G")), SAMPLE_RATE, FFT);
    expect(matchChord(chroma, "C").clean).toBe(false);
    expect(matchChord(chroma, "C").best).toBe("G");
  });

  it("ignores noise far below the chord", () => {
    const chroma = chromaFromSpectrum(spectrumOf(played("Am"), [61, 66]), SAMPLE_RATE, FFT);
    expect(matchChord(chroma, "Am").clean).toBe(true);
  });

  it("returns silence as an empty chroma", () => {
    const chroma = chromaFromSpectrum(new Float32Array(FFT / 2).fill(-Infinity), SAMPLE_RATE, FFT);
    expect([...chroma].every((v) => v === 0)).toBe(true);
  });
});

/* A real strum: Karplus-Strong strings, a Blackman window and an FFT, like the browser's analyser. */

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
}

function strum(id: ChordId, rate: number, length: number, skip: number, muted?: number): Float32Array {
  const out = new Float32Array(length);
  const random = seeded(7);
  CHORDS[id].notes.forEach((midi, string) => {
    if (midi === null || string === muted) return;
    const period = Math.round(rate / frequencyFromMidi(midi));
    const ring = Float32Array.from({ length: period }, random);
    let index = 0;
    const offset = string * 500;
    for (let i = 0; i < skip + length; i++) {
      const a = ring[index]!;
      const b = ring[(index + 1) % period]!;
      const at = i + offset - skip;
      if (at >= 0 && at < length) out[at]! += 0.25 * a;
      ring[index] = 0.996 * 0.5 * (a + b);
      index = (index + 1) % period;
    }
  });
  return out;
}

function spectrumDb(samples: Float32Array): Float32Array {
  const n = samples.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / n) + 0.08 * Math.cos((4 * Math.PI * i) / n);
    re[i] = samples[i]! * w;
  }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b]! * cos - im[b]! * sin;
        const ti = re[b]! * sin + im[b]! * cos;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a]! += tr;
        im[a]! += ti;
      }
    }
  }
  return Float32Array.from({ length: n / 2 }, (_, i) => 20 * Math.log10(Math.hypot(re[i]!, im[i]!) / n + 1e-12));
}

const heard = (id: ChordId, muted?: number) =>
  chromaFromSpectrum(spectrumDb(strum(id, SAMPLE_RATE, FFT, 12_000, muted)), SAMPLE_RATE, FFT);

describe("chord recognition on a plucked strum", () => {
  it.each([
    ["Em", 3, 7],
    ["Am", 4, 0],
    ["D", 5, 6],
    ["C", 4, null],
  ] as const)("on %s with string %i muted reports pitch class %s missing", (id, string, pc) => {
    const match = matchChord(heard(id, string), id);
    expect(match.missing).toEqual(pc === null ? [] : [pc]);
  });

  it.each(CHORD_IDS)("hears %s as itself, not its major or minor twin", (id) => {
    const chroma = chromaFromSpectrum(spectrumDb(strum(id, SAMPLE_RATE, FFT, 12_000)), SAMPLE_RATE, FFT);
    const match = matchChord(chroma, id);
    expect(match.best).toBe(id);
    expect(match.clean).toBe(true);
  });
});

describe("tuner", () => {
  const tone = (hz: number) =>
    Float32Array.from({ length: 4096 }, (_, i) => {
      const t = i / SAMPLE_RATE;
      // A string is rich in harmonics; the fundamental must still win.
      return 0.4 * Math.sin(2 * Math.PI * hz * t) + 0.25 * Math.sin(4 * Math.PI * hz * t) + 0.1 * Math.sin(6 * Math.PI * hz * t);
    });

  it.each([82.41, 110, 146.83, 196, 246.94, 329.63])("hears %f Hz", (hz) => {
    expect(pitchFromSamples(tone(hz), SAMPLE_RATE)).toBeCloseTo(hz, 0);
  });

  it.each([440, 659.25])("hears %f Hz when asked to look higher", (hz) => {
    expect(pitchFromSamples(tone(hz), SAMPLE_RATE, 1000)).toBeCloseTo(hz, 0);
  });

  it("stays silent below the noise floor", () => {
    expect(pitchFromSamples(new Float32Array(4096), SAMPLE_RATE)).toBeNull();
  });

  it("says which string and how far off", () => {
    expect(readTuning(110)).toEqual({ string: 1, cents: 0 });
    const flat = readTuning(196 * 2 ** (-20 / 1200));
    expect(flat.string).toBe(3);
    expect(flat.cents).toBe(-20);
  });
});

/* Every string must sound: a strum that stops short is not the chord, whatever the chroma says. */

function strumStrings(id: ChordId, strings: readonly number[]): Float32Array {
  const out = new Float32Array(FFT);
  const random = seeded(7);
  CHORDS[id].notes.forEach((midi, string) => {
    if (midi === null || !strings.includes(string)) return;
    const period = Math.round(SAMPLE_RATE / frequencyFromMidi(midi));
    const ring = Float32Array.from({ length: period }, random);
    let index = 0;
    const offset = string * 500;
    for (let i = 0; i < 12_000 + FFT; i++) {
      const a = ring[index]!;
      const b = ring[(index + 1) % period]!;
      const at = i + offset - 12_000;
      if (at >= 0 && at < FFT) out[at]! += 0.25 * a;
      ring[index] = 0.996 * 0.5 * (a + b);
      index = (index + 1) % period;
    }
  });
  return out;
}

const heardStrings = (id: ChordId, strings: readonly number[]) => {
  const spectrum = spectrumDb(strumStrings(id, strings));
  return matchHeard({ chroma: chromaFromSpectrum(spectrum, SAMPLE_RATE, FFT), spectrum, sampleRate: SAMPLE_RATE, fftSize: FFT }, id);
};
const playedStrings = (id: ChordId) => CHORDS[id].notes.flatMap((n, i) => (n === null ? [] : [i]));

describe("every string of the chord must sound", () => {
  it("knows which strings can be checked on their own: the ones not sitting on a lower string's harmonic", () => {
    // G: the open G (3rd string) is the octave of the bass, the high G two octaves: not checkable. The B strings and the D are.
    expect(checkableStrings("G")).toEqual([0, 1, 2]);
    expect(checkableStrings("Em")).toEqual([0, 1, 3]);
    expect(checkableStrings("D")).toEqual([2, 3, 5]);
    expect(checkableStrings("C")).toEqual([1, 2, 3]);
  });

  it.each(CHORD_IDS)("hears %s clean with every string, and not with the bass or the top three missing", (id) => {
    const all = playedStrings(id);
    expect(heardStrings(id, all).clean).toBe(true);
    expect(heardStrings(id, all).silent).toEqual([]);
    const noBass = heardStrings(id, all.slice(1));
    expect(noBass.silent).toContain(all[0]);
    expect(noBass.clean).toBe(false);
    const highOnly = heardStrings(id, all.slice(-3));
    expect(highOnly.clean).toBe(false);
    expect(highOnly.silent.length).toBeGreaterThan(0);
  });

  it("names the strings the strum skipped, lowest first, and sends the player to strum them all", () => {
    const all = playedStrings("G");
    const match = heardStrings("G", all.slice(-3)); // D G B high G... only the top three
    expect(match.missing).toEqual([2]); // the D is gone from the chroma too
    expect(match.silent).toEqual([0, 1, 2]);
    expect(fixFor("G", match.missing, match.silent)).toEqual({ kind: "strumStrings", strings: [0, 1, 2] });
    // One fretted string alone silent is a finger lying flat, as before.
    expect(fixFor("G", [], [1])).toEqual({ kind: "pressFinger", string: 1, finger: 1, fret: 2 });
    expect(fixFor("G", [], [])).toBeNull();
  });

  it("gives a string the benefit of the doubt only when it sits on a harmonic", () => {
    // Em without its open G (3rd string): the G is no harmonic of E or B, so its silence is heard.
    const all = playedStrings("Em");
    const noG = heardStrings("Em", all.filter((s) => s !== 3));
    expect(noG.silent).toEqual([3]);
  });
});

/* Strums are found by spectral flux: a ringing chord does not hide the next pick. */

/** Frames of a signal as the browser's analyser would see them: at time `at`, the last FFT samples. */
function framesOf(signal: Float32Array, fps = 60): { at: number; spectrum: Float32Array }[] {
  const hop = Math.round(SAMPLE_RATE / fps);
  const out: { at: number; spectrum: Float32Array }[] = [];
  for (let end = FFT; end <= signal.length; end += hop) {
    out.push({ at: (end / SAMPLE_RATE) * 1000, spectrum: spectrumDb(signal.subarray(end - FFT, end)) });
  }
  return out;
}

/** The same chord strummed at the given times, each strum starting while the last still rings. */
function strums(id: ChordId, atSeconds: number[], seconds: number): Float32Array {
  const out = new Float32Array(Math.round(SAMPLE_RATE * seconds));
  for (const at of atSeconds) {
    const one = strum(id, SAMPLE_RATE, out.length - Math.round(at * SAMPLE_RATE), 0);
    const start = Math.round(at * SAMPLE_RATE);
    for (let i = 0; i < one.length; i++) out[start + i]! += one[i]!;
  }
  return out;
}

describe("strum onsets", () => {
  it("finds every strum of a chord that keeps ringing, and nothing in the tail", () => {
    const times = [0.4, 1.3, 2.1];
    const detector = new OnsetDetector();
    const found: number[] = [];
    for (const f of framesOf(strums("G", times, 3.2))) if (detector.feed(f.spectrum, SAMPLE_RATE, FFT, f.at)) found.push(f.at);
    expect(found).toHaveLength(times.length);
    found.forEach((ms, i) => {
      expect(ms).toBeGreaterThanOrEqual(times[i]! * 1000);
      expect(ms).toBeLessThanOrEqual(times[i]! * 1000 + 150);
    });
  });

  it("stays quiet on silence", () => {
    const detector = new OnsetDetector();
    const silence = new Float32Array(SAMPLE_RATE * 1);
    let onsets = 0;
    for (const f of framesOf(silence)) if (detector.feed(f.spectrum, SAMPLE_RATE, FFT, f.at)) onsets++;
    expect(onsets).toBe(0);
  });
});
