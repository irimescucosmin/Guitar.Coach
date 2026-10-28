import { describe, expect, it } from "vitest";
import { CHORDS, CHORD_IDS, type ChordId } from "@/lib/music/chords";
import {
  chromaFromSpectrum,
  frequencyFromMidi,
  matchChord,
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
    add(2 * f, -28);
    add(3 * f, -34);
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
