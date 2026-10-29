import { describe, expect, it } from "vitest";
import { CHORDS, type ChordId } from "@/lib/music/chords";
import { chromaFromSpectrum, frequencyFromMidi } from "./detect";
import { DECAY_SHARE, MIN_FRAMES, StrumJudge, WINDOW_MS, type JudgeFrame } from "./judge";

const SAMPLE_RATE = 48_000;
const FFT = 16_384;
const SILENCE = 0.008;

/** A spectrum in dB with a peak and harmonics for every note, like the detector tests. */
function spectrumOf(notes: number[]): Float32Array {
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
    add(5 * f, -30);
  }
  return bins;
}
/** Room noise: energy spread over every bin, nothing standing out. */
function noiseSpectrum(): Float32Array {
  const bins = new Float32Array(FFT / 2);
  for (let i = 0; i < bins.length; i++) bins[i] = -60 + 6 * Math.sin(i * 1.7) * Math.cos(i * 0.31);
  return bins;
}

const played = (id: ChordId) => CHORDS[id].notes.filter((n): n is number => n !== null);

function frame(now: number, level: number, spectrum: Float32Array, over: Partial<JudgeFrame> = {}): JudgeFrame {
  return { now, level, attack: false, chroma: chromaFromSpectrum(spectrum, SAMPLE_RATE, FFT), spectrum, sampleRate: SAMPLE_RATE, fftSize: FFT, ownSound: false, ...over };
}

/** A strum: an onset, then frames every 16 ms with the level decaying. */
function strumFrames(start: number, spectrum: Float32Array, frames = 30, decay = 0.97): JudgeFrame[] {
  const out: JudgeFrame[] = [];
  let level = 0.2;
  for (let i = 0; i < frames; i++) {
    out.push(frame(start + i * 16, level, spectrum, { attack: i === 0 }));
    level *= decay;
  }
  return out;
}

function feedAll(judge: StrumJudge, frames: JudgeFrame[], target: ChordId) {
  return frames.map((f) => judge.feed(f, target, SILENCE)).filter((v) => v !== null);
}

describe("a chord is judged on the strum", () => {
  it("gives one verdict per strum, from the window after the onset", () => {
    const judge = new StrumJudge();
    const verdicts = feedAll(judge, strumFrames(0, spectrumOf(played("G"))), "G");
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]).toMatchObject({ kind: "strum", at: 0 });
    if (verdicts[0]!.kind === "strum") expect(verdicts[0]!.match.clean).toBe(true);
  });

  it("says nothing on the tail and between strums: a decayed G is not a G with notes missing", () => {
    const judge = new StrumJudge();
    const g = spectrumOf(played("G"));
    const frames = strumFrames(0, g, 20);
    // After the window: the tail, long, with fewer notes left (the high strings died first).
    const tail = spectrumOf(played("G").slice(0, 3));
    for (let i = 0; i < 60; i++) frames.push(frame(WINDOW_MS + 100 + i * 16, 0.02, tail));
    const verdicts = feedAll(judge, frames, "G");
    expect(verdicts).toHaveLength(1);
  });

  it("closes the window early when the sound has decayed, and needs a few frames to count", () => {
    const judge = new StrumJudge();
    const g = spectrumOf(played("G"));
    const frames = strumFrames(0, g, 40, DECAY_SHARE ** (1 / 6)); // down to the decay share within six frames
    const verdicts = feedAll(judge, frames, "G");
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]!.at).toBe(0);
    // A knock: onset then silence at once.
    const knock = [frame(1000, 0.2, g, { attack: true }), frame(1016, 0.001, g)];
    expect(feedAll(new StrumJudge(), knock, "G")).toEqual([]);
    const short = strumFrames(2000, g, MIN_FRAMES - 1);
    expect(feedAll(new StrumJudge(), short, "G")).toEqual([]);
  });

  it("calls the room noise, not a chord with notes missing", () => {
    const judge = new StrumJudge();
    const verdicts = feedAll(judge, strumFrames(0, noiseSpectrum()), "D");
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]!.kind).toBe("noise");
  });

  it("throws away a strum the app's own guitar was sounding over", () => {
    const judge = new StrumJudge();
    const frames = strumFrames(0, spectrumOf(played("G")));
    frames[3]!.ownSound = true;
    expect(feedAll(judge, frames, "G")).toEqual([]);
  });

  it("judges the fingers mid-change as the chord they were, not as a wrong chord for the next one", () => {
    // Fingers moving from G to D: the strum heard was a G. Then the target changes and the judge is reset.
    const judge = new StrumJudge();
    const verdicts = feedAll(judge, strumFrames(0, spectrumOf(played("G"))), "G");
    expect(verdicts[0]).toMatchObject({ kind: "strum" });
    judge.reset();
    // No strum after the change: nothing to say, however long the gap.
    const gap = Array.from({ length: 50 }, (_, i) => frame(2000 + i * 16, 0.03, spectrumOf(played("G").slice(0, 2))));
    expect(feedAll(judge, gap, "D")).toEqual([]);
    // The strum on D, once the fingers are there, is clean.
    const d = feedAll(judge, strumFrames(4000, spectrumOf(played("D"))), "D");
    expect(d).toHaveLength(1);
    if (d[0]!.kind === "strum") expect(d[0]!.match.clean).toBe(true);
  });

  it("a second onset inside the window judges the first strum and opens a new one", () => {
    const judge = new StrumJudge();
    const first = strumFrames(0, spectrumOf(played("G")), 10);
    const second = strumFrames(160, spectrumOf(played("D")), 30);
    const verdicts = feedAll(judge, [...first, ...second], "G");
    expect(verdicts.map((v) => v.at)).toEqual([0, 160]);
    if (verdicts[1]!.kind === "strum") expect(verdicts[1]!.match.best).toBe("D");
  });
});
