import { describe, expect, it } from "vitest";
import { byWeek, mondayOf, recordingProblem, songToKeepRecording, type RecordingInfo } from "./recordings";

const rec = (over: Partial<RecordingInfo>): RecordingInfo => ({ id: "r", song: "drill-em-am", mode: "timed", share: 0.8, week: "2026-10-26", day: "2026-10-28", durationMs: 30_000, ...over });

describe("recordings", () => {
  it("finds the Monday of any day", () => {
    expect(mondayOf("2026-10-29")).toBe("2026-10-26"); // a Thursday
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
    expect(mondayOf("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week before
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
  });

  it("keeps a short Opus or AAC file and refuses the rest", () => {
    expect(recordingProblem({ bytes: 200_000, mime: "audio/webm;codecs=opus", durationMs: 40_000 })).toBeNull();
    expect(recordingProblem({ bytes: 200_000, mime: "audio/mp4", durationMs: 40_000 })).toBeNull();
    expect(recordingProblem({ bytes: 200_000, mime: "video/webm", durationMs: 40_000 })).toBe("format");
    expect(recordingProblem({ bytes: 200_000, mime: "audio/webm", durationMs: 400_000 })).toBe("tooLong");
    expect(recordingProblem({ bytes: 9_000_000, mime: "audio/webm", durationMs: 40_000 })).toBe("tooBig");
    expect(recordingProblem({ bytes: 0, mime: "audio/webm", durationMs: 40_000 })).toBe("tooBig");
  });

  it("groups by week, newest first, and names the song recorded most", () => {
    const list = [
      rec({ id: "a", week: "2026-10-19", day: "2026-10-21" }),
      rec({ id: "b", week: "2026-10-26", day: "2026-10-27", song: "saints" }),
      rec({ id: "c", week: "2026-10-26", day: "2026-10-29" }),
    ];
    const weeks = byWeek(list);
    expect(weeks.map((w) => w.week)).toEqual(["2026-10-26", "2026-10-19"]);
    expect(weeks[0]!.recordings.map((r) => r.id)).toEqual(["c", "b"]);
    expect(songToKeepRecording(list)).toBe("drill-em-am");
    expect(songToKeepRecording([])).toBeNull();
  });
});
