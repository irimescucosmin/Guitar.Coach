import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, currentLessonIndex, nextTask, type Progress } from "./path";
import { needsRecheck, placedChords, retake, skipsDrillsFor, type Profile } from "./profile";

const base: Profile = {
  experience: "never",
  knowsOpenStrings: false,
  openStringsHeard: false,
  knownChords: [],
  verifiedChords: [],
  checked: true,
  readsTab: "no",
  guitar: "acoustic",
  minutes: 20,
  style: "folkCountry",
  goal: "fun",
  takenAt: "2026-10-01T10:00:00.000Z",
};

/** What the questionnaire leaves behind: the profile, and the placed chords as learned. */
const placed = (profile: Profile): Progress => ({
  ...EMPTY_PROGRESS,
  learned: Object.fromEntries(placedChords(profile).map((c) => [c, true as const])),
  profile,
});

describe("profile and placement", () => {
  it("counts only chords the microphone heard, when the check was done", () => {
    const p = { ...base, knownChords: ["Em", "Am", "G"] as Profile["knownChords"], verifiedChords: ["Em", "G"] as Profile["verifiedChords"] };
    expect(placedChords(p)).toEqual(["Em", "G"]);
  });

  it("places nothing when the check was skipped: a declaration is not proof", () => {
    const p = { ...base, checked: false, knownChords: ["Am", "Em"] as Profile["knownChords"] };
    expect(placedChords(p)).toEqual([]);
  });

  it("never places a chord that was heard but not declared", () => {
    const p = { ...base, knownChords: ["Em"] as Profile["knownChords"], verifiedChords: ["Em", "C"] as Profile["verifiedChords"] };
    expect(placedChords(p)).toEqual(["Em"]);
  });

  it("starts a complete beginner from the first chord", () => {
    expect(nextTask(placed(base))).toEqual({ kind: "learn", lesson: "emAm", chord: "Em" });
  });

  it("skips the notes lesson only when the microphone heard the open strings", () => {
    const pastTwoLessons: Pick<Progress, "learned" | "best"> = { learned: { Em: true, Am: true, G: true, D: true }, best: { "drill-em-am": { step: 2000, timed: 0.9 }, "drill-g-d": { step: 2000, timed: 0.9 } } };
    const at = (p: Profile) => nextTask({ ...placed(p), ...pastTwoLessons, profile: p });
    expect(at({ ...base, knowsOpenStrings: true })).toEqual({ kind: "notes", lesson: "notes" });
    expect(at({ ...base, knowsOpenStrings: true, openStringsHeard: true })).toEqual({ kind: "learn", lesson: "c", chord: "C" });
  });

  it("still asks a beginner who knows Em and Am for the drills", () => {
    const p = { ...base, knowsOpenStrings: true, openStringsHeard: true, knownChords: ["Em", "Am"] as Profile["knownChords"], verifiedChords: ["Em", "Am"] as Profile["verifiedChords"] };
    expect(skipsDrillsFor(p, ["Em", "Am"])).toBe(false);
    expect(nextTask(placed(p))).toEqual({ kind: "step", lesson: "emAm", song: "drill-em-am" });
  });

  it("places someone who has played before at the first lesson they lack", () => {
    const p: Profile = {
      ...base,
      experience: "months",
      knowsOpenStrings: true,
      openStringsHeard: true,
      knownChords: ["Em", "Am", "G", "D", "C"],
      verifiedChords: ["Em", "Am", "G", "D"],
    };
    // C was declared but not heard: lesson 3 starts with learning it.
    expect(nextTask(placed(p))).toEqual({ kind: "learn", lesson: "c", chord: "C" });
    expect(currentLessonIndex(placed(p))).toBe(3);
  });

  it("asks to answer again after two weeks", () => {
    expect(needsRecheck(base, new Date("2026-10-10T10:00:00Z"))).toBe(false);
    expect(needsRecheck(base, new Date("2026-10-15T10:00:00Z"))).toBe(true);
  });

  it("keeps what earlier answers placed when answering again", () => {
    const first: Profile = { ...base, experience: "months", knownChords: ["G", "D"], verifiedChords: ["G", "D"] };
    const again: Profile = { ...base, experience: "months", knownChords: ["G", "C"], verifiedChords: ["C"] };
    expect(placedChords(retake(first, again))).toEqual(["C", "G", "D"]);
    expect(placedChords(retake(first, { ...again, checked: false, verifiedChords: [] }))).toEqual(["G", "D"]);
    expect(retake(undefined, again)).toEqual(again);
  });
});
