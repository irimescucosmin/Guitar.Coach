import { describe, expect, it } from "vitest";
import { communitySongInput, isCommunityId, looksLikeLyrics, patternFits, songProblems, toSong, type CommunitySongInput } from "./song";

const ok: CommunitySongInput = {
  title: "Giro di Sol",
  kind: "traditional",
  origin: "Tradizionale",
  beatsPerBar: 4,
  pattern: "boomChick",
  sections: [{ name: "verse", bars: ["G", "G", "D", "G"], repeat: 2 }],
};

describe("community songs", () => {
  it("accepts a chord sheet and refuses anything that is not one", () => {
    expect(communitySongInput.safeParse(ok).success).toBe(true);
    expect(communitySongInput.safeParse({ ...ok, sections: [{ name: "verse", bars: ["G", "F#m"], repeat: 1 }] }).success).toBe(false);
    expect(communitySongInput.safeParse({ ...ok, sections: [] }).success).toBe(false);
    expect(communitySongInput.safeParse({ ...ok, beatsPerBar: 5 }).success).toBe(false);
  });

  it("spots a lyric line, a pattern that does not fit, a protected song without an author, a one-chord song", () => {
    expect(looksLikeLyrics("Take me home, country roads, to the place I belong, West Virginia, mountain mama")).toBe(true);
    expect(looksLikeLyrics("Tradizionale irlandese")).toBe(false);
    expect(patternFits("waltz", 4)).toBe(false);
    expect(songProblems(ok)).toEqual([]);
    expect(songProblems({ ...ok, pattern: "waltz" })).toEqual(["pattern"]);
    expect(songProblems({ ...ok, kind: "chordsOnly", origin: "" })).toEqual(["origin"]);
    expect(songProblems({ ...ok, sections: [{ name: "loop", bars: ["G", "G", "G"], repeat: 1 }] })).toEqual(["oneChord"]);
  });

  it("turns a stored row into a song the player can use, and drops a broken one", () => {
    const row = { id: "c-1", ...ok, authorId: "u1", authorName: "Anna", status: "published" as const, plays: 3 };
    const song = toSong(row);
    expect(song?.group).toBe("traditional");
    expect(song?.sections[0]?.bars).toEqual(["G", "G", "D", "G"]);
    expect(toSong({ ...row, kind: "chordsOnly" })?.group).toBe("progression");
    expect(toSong({ ...row, sections: "nope" })).toBeNull();
    expect(isCommunityId("c-1")).toBe(true);
    expect(isCommunityId("drill-em-am")).toBe(false);
  });
});
