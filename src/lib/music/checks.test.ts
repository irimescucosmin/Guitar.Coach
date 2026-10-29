import { describe, expect, it } from "vitest";
import { EMPTY_TUNE, IN_TUNE_READINGS, SPIDER_NOTES, allInTune, isSpiderNote, openStringOf, tuneStep } from "./checks";

describe("checks", () => {
  it("counts a string tuned only after several readings in a row in tune", () => {
    let s = EMPTY_TUNE;
    for (let i = 0; i < IN_TUNE_READINGS - 1; i++) s = tuneStep(s, { string: 0, cents: 3 });
    expect(s.done[0]).toBe(false);
    s = tuneStep(s, { string: 0, cents: 20 });
    s = tuneStep(s, { string: 0, cents: -2 });
    expect(s.done[0]).toBe(false);
    for (let i = 0; i < IN_TUNE_READINGS; i++) s = tuneStep(s, { string: 0, cents: -2 });
    expect(s.done[0]).toBe(true);
  });

  it("needs all six strings for the guitar to be tuned", () => {
    let s = EMPTY_TUNE;
    for (let string = 0; string < 5; string++) for (let i = 0; i < IN_TUNE_READINGS; i++) s = tuneStep(s, { string, cents: 0 });
    expect(allInTune(s)).toBe(false);
    for (let i = 0; i < IN_TUNE_READINGS; i++) s = tuneStep(s, { string: 5, cents: 1 });
    expect(allInTune(s)).toBe(true);
  });

  it("knows the 24 spider notes, frets 1 to 4 of each string", () => {
    expect(SPIDER_NOTES).toHaveLength(24);
    expect(new Set(SPIDER_NOTES).size).toBe(24);
    expect(isSpiderNote(41)).toBe(true); // F, low E string fret 1
    expect(isSpiderNote(40)).toBe(false); // the open string is not the spider
    expect(isSpiderNote(68)).toBe(true); // G#, high E string fret 4
  });

  it("names open strings exactly, an octave off is not the string", () => {
    expect(openStringOf(40)).toBe(0);
    expect(openStringOf(64)).toBe(5);
    expect(openStringOf(52)).toBe(-1);
  });
});
