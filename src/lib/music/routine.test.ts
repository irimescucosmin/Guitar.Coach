import { describe, expect, it } from "vitest";
import type { ChordId } from "./chords";
import { EMPTY_PROGRESS, type Progress } from "./path";
import type { Profile } from "./profile";
import { PAIR_KEYS, blocksDoneBy, dailyRoutine, isNearToday, pairKey, playableSongs, practisedPairs, streak, weakPair } from "./routine";

const learned = (...chords: ChordId[]) => Object.fromEntries(chords.map((c) => [c, true as const]));
const profile = (minutes: 10 | 20 | 30, style: Profile["style"] = "folkCountry"): Profile => ({
  experience: "never", knowsOpenStrings: false, knownChords: [], verifiedChords: [], checked: true,
  readsTab: "no", guitar: "acoustic", minutes, style, goal: "fun", takenAt: "2026-10-01T00:00:00.000Z",
});
const total = (p: Progress) => dailyRoutine(p, "2026-10-29").reduce((sum, b) => sum + b.minutes, 0);

describe("daily routine", () => {
  it("always fills exactly the minutes the player has", () => {
    const states: Progress[] = [
      EMPTY_PROGRESS,
      { ...EMPTY_PROGRESS, learned: learned("Em", "Am") },
      { ...EMPTY_PROGRESS, learned: learned("Em", "Am", "G", "D", "C", "Dm", "E", "A"), best: {} },
    ];
    for (const minutes of [10, 20, 30] as const) {
      for (const state of states) expect(total({ ...state, profile: profile(minutes) })).toBe(minutes);
    }
  });

  it("starts with tuning and gives a beginner with no chords only tuning, warm-up and the next step", () => {
    const blocks = dailyRoutine({ ...EMPTY_PROGRESS, profile: profile(20) }, "2026-10-29");
    expect(blocks.map((b) => b.id)).toEqual(["tune", "warmup", "new"]);
    expect(blocks[2]).toMatchObject({ id: "new", minutes: 16, task: { kind: "notes" } });
  });

  it("keeps ten minutes to tuning, the new step and one change", () => {
    const blocks = dailyRoutine({ ...EMPTY_PROGRESS, learned: learned("Em", "Am", "G"), profile: profile(10) }, "2026-10-29");
    expect(blocks.map((b) => b.id)).toEqual(["tune", "new", "changes"]);
  });

  it("drills a change the songs ask for, the newest untested one first", () => {
    const p: Progress = { ...EMPTY_PROGRESS, learned: learned("Em", "Am", "G", "D") };
    expect(practisedPairs(p).map(([a, b]) => pairKey(a, b))).toContain("G-D");
    expect(weakPair(p)?.pair).toEqual(["G", "D"]);
  });

  it("drills the slowest change once every pair has a result", () => {
    const p: Progress = { ...EMPTY_PROGRESS, learned: learned("Em", "Am"), changes: { "Em-Am": 31 } };
    expect(weakPair(p)).toEqual({ pair: ["Em", "Am"], best: 31 });
    const two: Progress = { ...EMPTY_PROGRESS, learned: learned("Em", "Am", "G", "D"), changes: {} };
    for (const [a, b] of practisedPairs(two)) two.changes![pairKey(a, b)] = 40;
    two.changes!["G-D"] = 12;
    expect(weakPair(two)?.pair).toEqual(["G", "D"]);
  });

  it("offers only songs whose chords are all learned, the player's style first", () => {
    const p: Progress = { ...EMPTY_PROGRESS, learned: learned("G", "D"), profile: profile(20, "folkCountry") };
    const songs = playableSongs(p);
    expect(songs.length).toBeGreaterThan(0);
    expect(songs.every((s) => s.group !== "exercise")).toBe(true);
    expect(["boomChick", "waltz"]).toContain(songs[0]!.pattern);
  });

  it("turns the song of the day, the same all day", () => {
    const p: Progress = { ...EMPTY_PROGRESS, learned: learned("Em", "Am", "G", "D", "C"), profile: profile(30) };
    const song = (date: string) => dailyRoutine(p, date).find((b) => b.id === "song");
    expect(song("2026-10-29")).toEqual(song("2026-10-29"));
    const week = new Set(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"].map((d) => (song(d) as { song: string }).song));
    expect(week.size).toBeGreaterThan(1);
  });
});

describe("streak", () => {
  it("counts days in a row up to today", () => {
    expect(streak(["2026-10-27", "2026-10-28", "2026-10-29"], "2026-10-29")).toBe(3);
  });
  it("does not break before the day is over", () => {
    expect(streak(["2026-10-27", "2026-10-28"], "2026-10-29")).toBe(2);
  });
  it("starts again after a missed day", () => {
    expect(streak(["2026-10-25", "2026-10-26", "2026-10-28"], "2026-10-29")).toBe(1);
    expect(streak(["2026-10-25"], "2026-10-29")).toBe(0);
  });
});

describe("routine bookkeeping", () => {
  it("marks a block when the player does its thing, wherever they do it", () => {
    const p: Progress = { ...EMPTY_PROGRESS, learned: learned("Em", "Am", "G"), profile: { ...profile(20), knowsOpenStrings: true } };
    const routine = dailyRoutine(p, "2026-10-29");
    expect(routine.find((b) => b.id === "new")).toMatchObject({ task: { kind: "step", song: "drill-em-am" } });
    expect(blocksDoneBy(routine, { kind: "run", song: "drill-em-am", mode: "step" })).toEqual(["new"]);
    expect(blocksDoneBy(routine, { kind: "run", song: "drill-em-am", mode: "listen" })).toEqual([]);
    expect(blocksDoneBy(routine, { kind: "learn", chord: "D" })).toEqual([]);
  });

  it("knows every pair once, in path order", () => {
    expect(PAIR_KEYS).toHaveLength(28);
    expect(PAIR_KEYS).toContain("G-D");
    expect(PAIR_KEYS).not.toContain("D-G");
  });

  it("believes a browser date only within a day of the server's", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(isNearToday("2026-10-29", now)).toBe(true);
    expect(isNearToday("2026-10-30", now)).toBe(true);
    expect(isNearToday("2026-11-02", now)).toBe(false);
    expect(isNearToday("29/10/2026", now)).toBe(false);
  });
});
