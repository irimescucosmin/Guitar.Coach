import { describe, expect, it } from "vitest";
import { NOTE_DRILL, isNatural, judgeNote, midiAt, pitchClassAt, positionsOf } from "./fretboard";
import { frequentNext, transition } from "./transitions";

describe("notes on the neck", () => {
  it("names the open strings Mi La Re Sol Si Mi", () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => pitchClassAt(s, 0))).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it("puts Fa one fret above Mi and Do one fret above Si", () => {
    expect(pitchClassAt(5, 1)).toBe(5);
    expect(pitchClassAt(4, 1)).toBe(0);
  });

  it("starts again at the 12th fret, one octave up", () => {
    for (let s = 0; s < 6; s++) expect(midiAt(s, 12) - midiAt(s, 0)).toBe(12);
  });

  it("finds every Sol between fret 0 and 12", () => {
    expect(positionsOf(7)).toEqual([
      { string: 0, fret: 3 }, { string: 1, fret: 10 }, { string: 2, fret: 5 },
      { string: 3, fret: 0 }, { string: 3, fret: 12 }, { string: 4, fret: 8 }, { string: 5, fret: 3 },
    ]);
  });

  it("tells naturals from sharps", () => {
    expect([0, 1, 2, 3, 4, 5].map(isNatural)).toEqual([true, false, true, false, true, true]);
  });

  it("drills only natural notes, starting from the open strings", () => {
    expect(NOTE_DRILL.slice(0, 6).every((t) => t.fret === 0)).toBe(true);
    expect(NOTE_DRILL.every((t) => isNatural(pitchClassAt(t.string, t.fret)))).toBe(true);
  });

  it("judges a note: right, an octave off, or how many frets off", () => {
    const fa = { string: 5, fret: 1 }; // F4 = 65
    expect(judgeNote(65.2, fa)).toEqual({ kind: "right" });
    expect(judgeNote(64, fa)).toEqual({ kind: "off", direction: "up", frets: 1 });
    expect(judgeNote(67, fa)).toEqual({ kind: "off", direction: "down", frets: 2 });
    expect(judgeNote(53, fa)).toEqual({ kind: "octave", direction: "up" });
  });
});

describe("chord changes", () => {
  it("sees that index and middle stay from Am to C, and the ring finger moves", () => {
    const t = transition("Am", "C");
    expect(t.stay.sort()).toEqual([1, 2]);
    expect(t.move).toEqual([3]);
    expect(t.lead).toBe(3);
  });

  it("sees middle and ring slide one string from Em to Am, and the index arrive", () => {
    const t = transition("Em", "Am");
    expect(t.slide.map((s) => s.finger).sort()).toEqual([2, 3]);
    expect(t.arrive).toEqual([1]);
    expect(t.lead).toBe(2);
  });

  it("sees the ring finger slide from high E to B from G to D", () => {
    expect(transition("G", "D").slide).toEqual([{ finger: 3, from: 5, to: 4 }]);
  });

  it("knows D and C are what usually follows G", () => {
    expect(frequentNext("G").sort()).toEqual(["C", "D"]);
  });
});
