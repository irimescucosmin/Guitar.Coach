import { describe, expect, it } from "vitest";
import { guestProgress, recordingInput, runInput } from "./validation";

describe("validation", () => {
  it("drops from guest progress what the catalogue does not know, community results included", () => {
    const parsed = guestProgress.parse({
      learned: { Em: true, Fx: true },
      best: { "drill-em-am": { timed: 0.9 }, "c-abcdef123456": { timed: 1 }, gone: { step: 1 } },
    });
    expect(parsed.learned).toEqual({ Em: true });
    expect(Object.keys(parsed.best)).toEqual(["drill-em-am"]);
  });

  it("takes a run on a catalogue, exercise or community id, but records only songs", () => {
    expect(runInput.safeParse({ songId: "arp-Em", mode: "step", value: 3000 }).success).toBe(true);
    expect(runInput.safeParse({ songId: "c-abcdef123456", mode: "timed", value: 0.8 }).success).toBe(true);
    expect(runInput.safeParse({ songId: "made-up", mode: "timed", value: 0.8 }).success).toBe(false);
    const rec = { mode: "timed", share: 0.8, day: new Date().toISOString().slice(0, 10), durationMs: 20_000 };
    expect(recordingInput.safeParse({ ...rec, songId: "tom-dooley" }).success).toBe(true);
    expect(recordingInput.safeParse({ ...rec, songId: "c-abcdef123456" }).success).toBe(true);
    expect(recordingInput.safeParse({ ...rec, songId: "arp-Em" }).success).toBe(false);
    expect(recordingInput.safeParse({ ...rec, songId: "ear-1" }).success).toBe(false);
  });
});
