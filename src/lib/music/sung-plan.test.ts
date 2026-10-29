import { describe, expect, it } from "vitest";
import { SONGS, barsOf, findSong } from "./songs";
import { SUNG_BPM, compositionPlan, keyOf } from "./sung-plan";

describe("sung version plan", () => {
  it("keeps the song's structure: one section per pass, as long as its bars at the tempo", () => {
    const song = findSong("tom-dooley")!;
    const plan = compositionPlan(song);
    expect(plan.sections.map((s) => s.section_name)).toEqual(["Chorus 1", "Verse 1", "Chorus 2"]);
    const barMs = (song.beatsPerBar * 60_000) / SUNG_BPM;
    expect(plan.sections[0]!.duration_ms).toBe(Math.round(8 * barMs));
    expect(plan.sections.reduce((t, s) => t + s.duration_ms, 0)).toBeCloseTo(barsOf(song).length * barMs, -1);
  });

  it("sings the words, leaves a strummed section without voice, and names the chords", () => {
    const plan = compositionPlan(findSong("tom-dooley")!);
    expect(plan.sections[0]!.lines[0]).toBe("Hang down your head, Tom Dooley, hang down your head and cry;");
    expect(plan.sections[1]!.lines).toEqual([]);
    expect(plan.sections[1]!.negative_local_styles).toContain("vocals");
    expect(plan.sections[0]!.positive_local_styles[0]).toBe("chords bar by bar: G G G D D D D G");
  });

  it("knows the key of every traditional song", () => {
    expect(keyOf(findSong("drunken-sailor")!)).toBe("D minor");
    expect(keyOf(findSong("tom-dooley-in-a")!)).toBe("A major");
    for (const song of SONGS.filter((s) => s.group === "traditional")) expect(keyOf(song), song.id).toMatch(/major|minor/);
  });
});
