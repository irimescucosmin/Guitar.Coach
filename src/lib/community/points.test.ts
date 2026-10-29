import { describe, expect, it } from "vitest";
import { authorScore, POINTS_PASS, POINTS_PUBLISHED } from "./points";
import type { CommunitySong } from "./song";

const song = (over: Partial<CommunitySong>): CommunitySong => ({
  id: "c-1",
  title: "Giro",
  kind: "traditional",
  source: "Tradizionale",
  origin: "traditional",
  group: "traditional",
  beatsPerBar: 4,
  pattern: "down",
  sections: [{ name: "loop", bars: ["G", "D"], repeat: 2 }],
  authorId: "anna",
  authorName: "Anna",
  status: "published",
  plays: 0,
  ...over,
});

describe("points", () => {
  it("counts published songs and the players who passed them, nothing for drafts or hidden songs", () => {
    const songs = [
      song({ id: "c-1", plays: 3 }),
      song({ id: "c-2", plays: 0 }),
      song({ id: "c-3", status: "draft", plays: 2 }),
      song({ id: "c-4", status: "hidden", plays: 9 }),
      song({ id: "c-5", authorId: "bo", plays: 4 }),
    ];
    const anna = authorScore(songs, "anna");
    expect(anna.published).toBe(2);
    expect(anna.helped).toBe(3);
    expect(anna.points).toBe(2 * POINTS_PUBLISHED + 3 * POINTS_PASS);
    expect(anna.badges).toEqual(["firstSong", "firstHelp"]);
    expect(authorScore(songs, "nobody")).toEqual({ published: 0, helped: 0, points: 0, badges: [] });
  });

  it("gives the bigger badges at five songs and ten, fifty passes", () => {
    const five = Array.from({ length: 5 }, (_, i) => song({ id: `c-${i}`, plays: i === 0 ? 50 : 0 }));
    expect(authorScore(five, "anna").badges).toEqual(["firstSong", "fiveSongs", "firstHelp", "tenHelps", "fiftyHelps"]);
  });
});
