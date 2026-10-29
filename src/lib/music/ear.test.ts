import { describe, expect, it } from "vitest";
import { CHORDS } from "./chords";
import { EAR_LEVELS, ROUND_LENGTH, earChords, earId, earLevelToPractise, earRound, isMinor, unlockedLevel } from "./ear";
import { EMPTY_PROGRESS, type Progress } from "./path";

const midiOf = (s: { note: number } | { chord: string }) => ("note" in s ? s.note : -1);

describe("ear training", () => {
  it("builds the same round from the same seed, ten questions with the answer among the options", () => {
    for (const level of EAR_LEVELS) {
      const a = earRound(level, ["Em", "Am", "G", "D"], 42);
      expect(a).toEqual(earRound(level, ["Em", "Am", "G", "D"], 42));
      expect(a).toHaveLength(ROUND_LENGTH);
      for (const q of a) expect(q.options).toContain(q.answer);
    }
  });

  it("level 1 narrows from an octave to a semitone, and the answer names the higher note", () => {
    const round = earRound(1, [], 7);
    const gaps = round.map((q) => Math.abs(midiOf(q.sounds[0]!) - midiOf(q.sounds[1]!)));
    expect(gaps[0]).toBe(12);
    expect(gaps.at(-1)).toBe(1);
    for (const q of round) {
      const [first, second] = q.sounds.map(midiOf);
      expect(q.answer).toBe(second! > first! ? "second" : "first");
    }
  });

  it("level 2 always plays low E first, as the reference", () => {
    for (const q of earRound(2, [], 3)) {
      expect(q.sounds[0]).toEqual({ note: 40 });
      expect(q.answer).not.toBe("s0");
    }
  });

  it("level 4 pairs each major chord with its minor twin, and knows which is which", () => {
    for (const q of earRound(4, [], 11)) {
      const chord = (q.sounds[0] as { chord: keyof typeof CHORDS }).chord;
      expect(q.answer).toBe(isMinor(chord) ? "minor" : "major");
    }
    expect(isMinor("Em")).toBe(true);
    expect(isMinor("E")).toBe(false);
  });

  it("level 5 asks only among the chords learned, at most four choices", () => {
    for (const q of earRound(5, ["Em", "Am", "G", "D", "C"], 5)) {
      expect(q.options.length).toBeLessThanOrEqual(4);
      for (const o of q.options) expect(["Em", "Am", "G", "D", "C"]).toContain(o);
    }
    expect(earChords(EMPTY_PROGRESS)).toEqual(["Em", "Am"]);
  });

  it("opens a level after eight right out of ten in the one before", () => {
    const with_ = (scores: Record<number, number>): Progress => ({
      ...EMPTY_PROGRESS,
      best: Object.fromEntries(Object.entries(scores).map(([l, v]) => [earId(Number(l) as 1), { timed: v }])),
    });
    expect(unlockedLevel(EMPTY_PROGRESS)).toBe(1);
    expect(unlockedLevel(with_({ 1: 0.7 }))).toBe(1);
    expect(unlockedLevel(with_({ 1: 0.8 }))).toBe(2);
    expect(unlockedLevel(with_({ 1: 0.9, 2: 1, 3: 0.8 }))).toBe(4);
    expect(earLevelToPractise(with_({ 1: 0.9, 2: 0.6 }))).toBe(2);
    expect(earLevelToPractise(with_({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }))).toBe(5);
  });
});
