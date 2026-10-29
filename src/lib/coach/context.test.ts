import { describe, expect, it } from "vitest";
import { EMPTY_HISTORY, type History } from "@/lib/music/history";
import { EMPTY_PROGRESS, type Progress } from "@/lib/music/path";
import { playerContext, summarySystem, teacherSystem } from "./context";

describe("coach context", () => {
  it("describes a new player from facts only", () => {
    const text = playerContext(EMPTY_PROGRESS, EMPTY_HISTORY, "2026-10-29");
    expect(text).toContain("Has not answered the questionnaire yet.");
    expect(text).toContain("none yet");
    expect(text).toContain("Lesson 0 of 5 (emAm)");
    expect(text).toContain("Practice days this week: 0 of 7");
  });

  it("includes what was measured and what to review", () => {
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      learned: { Em: true, Am: true },
      best: { "drill-em-am": { timed: 0.5 }, "ear-1": { timed: 0.9 } },
      changes: { "Em-Am": 24 },
    };
    const history: History = {
      runs: [{ song: "drill-em-am", mode: "timed", value: 0.5, day: "2026-10-28" }],
      changes: [{ pair: "Em-Am", count: 24, day: "2026-10-28" }, { pair: "Em-Am", count: 18, day: "2026-10-20" }],
      days: [{ day: "2026-10-28", blocks: 3 }],
    };
    const text = playerContext(progress, history, "2026-10-29");
    expect(text).toContain("Chords learned (heard clean by the microphone): Em, Am.");
    expect(text).toContain("One-minute changes Em-Am: best this week 24, previous week 18.");
    expect(text).toContain("Em ↔ Am: best 50%");
    expect(text).toContain("Ear training best rounds: level 1: 90%.");
    expect(text).toContain("To review: change Em-Am (24/min); Em ↔ Am in time (50%).");
  });

  it("briefs the teacher in the player's language with the facts attached", () => {
    const system = teacherSystem("it", "FACTS");
    expect(system).toContain("Answer in Italian");
    expect(system).toContain("see a doctor");
    expect(system.endsWith("FACTS")).toBe(true);
    expect(summarySystem("en", "FACTS")).toContain("Write in English");
  });
});
