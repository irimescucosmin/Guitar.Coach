import { describe, expect, it } from "vitest";
import { capoFor, chordsOfKey, keysWith, parseChordName, taughtChords, transposeName } from "./theory";

describe("theory", () => {
  it("reads and writes chord names, and moves them up for a capo", () => {
    expect(parseChordName("F#m")).toEqual({ root: 6, minor: true });
    expect(parseChordName("Bb")).toEqual({ root: 10, minor: false });
    expect(parseChordName("Cmaj7")).toBeNull();
    expect(transposeName("G", 2)).toBe("A");
    expect(transposeName("Em", 3)).toBe("Gm");
    expect(transposeName("D", 0)).toBe("D");
    expect(transposeName("A", 3)).toBe("C");
  });

  it("knows the six chords of a key and which ones the app teaches", () => {
    expect(chordsOfKey(7)).toEqual(["G", "Am", "Bm", "C", "D", "Em"]);
    expect(chordsOfKey(0)).toEqual(["C", "Dm", "Em", "F", "G", "Am"]);
    const g = taughtChords(7);
    expect(g.map((c) => c.taught)).toEqual(["G", "Am", null, "C", "D", "Em"]);
  });

  it("finds the key of a progression, and the capo between two keys", () => {
    expect(keysWith(["G", "C", "D", "Em"])).toEqual([7]);
    expect(keysWith(["Am", "C"])).toEqual([0, 5, 7]); // C major, F major, G major
    expect(keysWith(["E", "Em"])).toEqual([]);
    expect(capoFor(7, 9)).toBe(2); // G shapes, capo 2, sounds in A
    expect(capoFor(7, 0)).toBe(5);
    expect(capoFor(0, 0)).toBe(0);
  });
});
