import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, type Progress } from "./path";
import { calendar, changeSeries, dailyBest, reviewList, stepSeries, weekSummary, type History } from "./history";

const h: History = {
  runs: [
    { song: "drill-em-am", mode: "step", value: 3000, day: "2026-10-20" },
    { song: "drill-em-am", mode: "step", value: 2400, day: "2026-10-20" },
    { song: "drill-em-am", mode: "step", value: 1900, day: "2026-10-27" },
    { song: "drill-em-am", mode: "timed", value: 0.6, day: "2026-10-21" },
    { song: "drill-em-am", mode: "timed", value: 0.85, day: "2026-10-28" },
    { song: "ear-1", mode: "timed", value: 0.9, day: "2026-10-28" },
  ],
  changes: [
    { pair: "Em-Am", count: 22, day: "2026-10-21" },
    { pair: "Em-Am", count: 30, day: "2026-10-28" },
    { pair: "Em-Am", count: 27, day: "2026-10-28" },
  ],
  days: [
    { day: "2026-10-21", blocks: 3 },
    { day: "2026-10-27", blocks: 2 },
    { day: "2026-10-28", blocks: 5 },
  ],
};

describe("history", () => {
  it("keeps the best of each day, lower for times and higher for counts", () => {
    expect(stepSeries(h, "drill-em-am")).toEqual([
      { day: "2026-10-20", value: 2400 },
      { day: "2026-10-27", value: 1900 },
    ]);
    expect(changeSeries(h, "Em-Am")).toEqual([
      { day: "2026-10-21", value: 22 },
      { day: "2026-10-28", value: 30 },
    ]);
    expect(dailyBest([], "higher")).toEqual([]);
  });

  it("sums up the week against the one before", () => {
    const w = weekSummary(h, "2026-10-28");
    expect(w.days).toBe(2);
    expect(w.previousDays).toBe(1);
    expect(w.changes).toEqual([{ pair: "Em-Am", best: 30, previous: 22 }]);
    expect(w.timed).toEqual([{ song: "drill-em-am", best: 0.85, previous: 0.6 }]);
  });

  it("lists what to review: weak changes, songs not passed in time, the ear level not passed", () => {
    const p: Progress = {
      ...EMPTY_PROGRESS,
      learned: { Em: true, Am: true, G: true, D: true },
      best: { "drill-em-am": { timed: 0.5 }, "drill-g-d": { timed: 0.9 }, "ear-1": { timed: 0.9 }, "ear-2": { timed: 0.5 } },
      changes: { "Em-Am": 30 },
    };
    const items = reviewList(p);
    const pairs = items.filter((i) => i.kind === "pair");
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ kind: "pair", pair: ["Em", "Am"], best: 30 });
    expect(pairs).toContainEqual(expect.objectContaining({ best: null }));
    expect(items).toContainEqual({ kind: "song", song: "drill-em-am", best: 0.5 });
    expect(items).not.toContainEqual(expect.objectContaining({ song: "drill-g-d" }));
    expect(items).toContainEqual({ kind: "ear", level: 2, best: 0.5 });
  });

  it("lays out the calendar in weeks, Monday first, ending today", () => {
    const weeks = calendar(h, "2026-10-29", 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]![0]!.day).toBe("2026-10-19"); // a Monday
    expect(weeks[1]!.at(-1)!.day).toBe("2026-10-29");
    expect(weeks.flat().find((d) => d.day === "2026-10-28")!.blocks).toBe(5);
  });
});
