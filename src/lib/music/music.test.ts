import { describe, expect, it } from "vitest";
import { CHORDS, CHORD_IDS, alternateBassString, stringsForPitchClasses } from "./chords";
import { SONGS, barsOf, chordsOf, findSong, nextChangeAfter, stepsOf } from "./songs";
import {
  EMPTY_PROGRESS,
  LESSONS,
  PASS_SCORE,
  hasPassedASong,
  lessonIndexFor,
  lessonStates,
  nextModeFor,
  nextTask,
  readyForTimed,
  recordResult,
  type Progress,
} from "./path";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pcs = (id: keyof typeof CHORDS) => CHORDS[id].pitchClasses.map((p) => NAMES[p]).sort();

describe("chords", () => {
  it("sound the triad they are named after", () => {
    expect(pcs("Em")).toEqual(["B", "E", "G"]);
    expect(pcs("Am")).toEqual(["A", "C", "E"]);
    expect(pcs("C")).toEqual(["C", "E", "G"]);
    expect(pcs("G")).toEqual(["B", "D", "G"]);
    expect(pcs("D")).toEqual(["A", "D", "F#"]);
    expect(pcs("Dm")).toEqual(["A", "D", "F"]);
    expect(pcs("E")).toEqual(["B", "E", "G#"]);
    expect(pcs("A")).toEqual(["A", "C#", "E"]);
  });

  it("put the root in the bass", () => {
    for (const id of CHORD_IDS) {
      const chord = CHORDS[id];
      const bass = chord.notes[chord.bassString]!;
      expect(bass % 12, id).toBe(chord.pitchClasses[0]);
    }
  });

  it("use a finger on every fretted string and none on open or muted ones", () => {
    for (const id of CHORD_IDS) {
      CHORDS[id].frets.forEach((fret, i) => {
        expect(fret > 0, `${id} string ${i}`).toBe(CHORDS[id].fingers[i]! > 0);
      });
    }
  });

  it("map a missing note back to its strings", () => {
    // G on Em sounds on the 3rd string, open.
    expect(stringsForPitchClasses(CHORDS.Em, [7])).toEqual([3]);
    // C on C: 5th string 3rd fret and 2nd string 1st fret.
    expect(stringsForPitchClasses(CHORDS.C, [0])).toEqual([1, 4]);
  });

  it("alternate the bass on the next string up", () => {
    expect(alternateBassString(CHORDS.G)).toBe(1);
    expect(alternateBassString(CHORDS.D)).toBe(3);
  });
});

describe("songs", () => {
  it("only use chords the app can teach", () => {
    for (const song of SONGS) for (const c of chordsOf(song)) expect(CHORD_IDS, song.id).toContain(c);
  });

  it("have unique ids", () => {
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
  });

  it("unfold repeats into bars", () => {
    const bars = barsOf(findSong("drill-em-am")!);
    expect(bars).toHaveLength(16);
    expect(bars[0]).toMatchObject({ chord: "Em", pass: 1, opensSection: true });
    expect(bars[4]).toMatchObject({ chord: "Em", pass: 2, opensSection: true });
  });

  it("collapse equal neighbours into steps", () => {
    const steps = stepsOf(barsOf(findSong("drill-em-am")!));
    expect(steps.map((s) => s.chord)).toEqual(["Em", "Am", "Em", "Am", "Em", "Am", "Em", "Am"]);
    expect(steps[1]).toEqual({ chord: "Am", firstBar: 2, bars: 2 });
  });

  it("find the next change, skipping repeats of the same chord", () => {
    const bars = barsOf(findSong("drill-em-am")!);
    expect(nextChangeAfter(bars, 0)).toBe(2);
    expect(nextChangeAfter(bars, 15)).toBe(-1);
  });
});

describe("path", () => {
  it("knows when a player has passed a song in time", () => {
    expect(hasPassedASong(EMPTY_PROGRESS)).toBe(false);
    expect(hasPassedASong({ learned: {}, best: { x: { step: 30, timed: PASS_SCORE - 0.01 } } })).toBe(false);
    expect(hasPassedASong({ learned: {}, best: { x: { timed: PASS_SCORE } } })).toBe(true);
  });

  it("covers every song in the catalogue exactly once", () => {
    const used = LESSONS.filter((l) => l.id !== "notes").flatMap((l) => [l.drill, ...l.songs]);
    expect(new Set(used).size).toBe(used.length);
    expect(used.sort()).toEqual(SONGS.map((s) => s.id).sort());
  });

  it("never asks for a chord before its lesson", () => {
    const known = new Set<string>();
    for (const lesson of LESSONS.filter((l) => l.id !== "notes")) {
      lesson.newChords.forEach((c) => known.add(c));
      for (const id of [lesson.drill, ...lesson.songs]) {
        for (const c of chordsOf(findSong(id)!)) expect(known.has(c), `${id} needs ${c}`).toBe(true);
      }
    }
  });

  it("starts with a sound: the first chord, then the first songs, the notes only after", () => {
    expect(nextTask(EMPTY_PROGRESS)).toEqual({ kind: "learn", lesson: "emAm", chord: "Em" });
    expect(LESSONS.map((l) => l.id)).toEqual(["emAm", "gD", "notes", "c", "dm", "eA"]);
    expect(LESSONS[1]!.songs.length).toBeGreaterThan(0);
  });

  it("moves to step mode, then timed, then the next lesson", () => {
    let p: Progress = { learned: { Em: true, Am: true }, best: {} };
    expect(nextTask(p)).toMatchObject({ kind: "step", song: "drill-em-am" });
    p = recordResult(p, "drill-em-am", "step", 3000).progress;
    expect(nextTask(p)).toMatchObject({ kind: "timed", song: "drill-em-am" });
    p = recordResult(p, "drill-em-am", "timed", PASS_SCORE - 0.01).progress;
    expect(nextTask(p)).toMatchObject({ kind: "timed" });
    p = recordResult(p, "drill-em-am", "timed", 0.9).progress;
    expect(nextTask(p)).toEqual({ kind: "learn", lesson: "gD", chord: "G" });
    expect(lessonStates(p)[0]!.complete).toBe(true);
  });

  it("keeps the best result: fastest step, highest timed score", () => {
    let p = recordResult(EMPTY_PROGRESS, "x", "step", 3000).progress;
    expect(recordResult(p, "x", "step", 3500).isRecord).toBe(false);
    p = recordResult(p, "x", "step", 2000).progress;
    expect(p.best.x!.step).toBe(2000);
    p = recordResult(p, "x", "timed", 0.5).progress;
    expect(recordResult(p, "x", "timed", 0.4).isRecord).toBe(false);
  });

  it("says what a song asks for next", () => {
    const wagon = findSong("wagon-wheel")!;
    expect(nextModeFor(wagon, { learned: { G: true, D: true }, best: {} })).toEqual({ kind: "learnFirst", chord: "Em" });
    const all: Progress = { learned: { G: true, D: true, Em: true, C: true }, best: {} };
    expect(nextModeFor(wagon, all)).toEqual({ kind: "step" });
    expect(nextModeFor(wagon, { ...all, best: { "wagon-wheel": { step: 2000, timed: 0.5 } } })).toEqual({ kind: "timed" });
    expect(nextModeFor(wagon, { ...all, best: { "wagon-wheel": { step: 2000, timed: 0.9 } } })).toEqual({ kind: "faster" });
  });

  it("says timed mode is reachable when a change fits in one bar", () => {
    // 100 bpm in 4/4: a bar lasts 2.4 s.
    expect(readyForTimed(2400, 100, 4)).toBe(true);
    expect(readyForTimed(2500, 100, 4)).toBe(false);
  });
});

describe("where a published song lands", () => {
  it("is the first lesson by which all its chords are taught", () => {
    expect(lessonIndexFor(["Em", "Am"])).toBe(0);
    expect(lessonIndexFor(["G", "D", "Em"])).toBe(1);
    expect(lessonIndexFor(["C", "G"])).toBe(3);
    expect(lessonIndexFor(["A", "D"])).toBe(5);
    expect(lessonIndexFor(["Em", "Am", "C", "G", "D", "Dm", "E", "A"])).toBe(5);
    expect(lessonIndexFor([])).toBe(0);
  });
});
