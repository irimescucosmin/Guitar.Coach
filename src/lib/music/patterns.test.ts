import { describe, expect, it } from "vitest";
import { bandEvents, guitarEvents, patternSymbols } from "./patterns";

describe("strum patterns", () => {
  it("strum once per beat in the beginner pattern", () => {
    expect(patternSymbols("down", 4)).toEqual(["↓", "↓", "↓", "↓"]);
  });

  it("alternate bass and treble in boom-chick", () => {
    expect(patternSymbols("boomChick", 4)).toEqual(["●", "↓", "●", "↓"]);
    expect(guitarEvents("boomChick", 2, 4)).toEqual([{ at: 0, kind: "bass", alternate: true }]);
  });

  it("fall back to a waltz in three", () => {
    expect(patternSymbols("boomChick", 3)).toEqual(["●", "↓", "↓"]);
  });

  it("play down, down-up, up-down-up in the folk pattern", () => {
    expect(patternSymbols("folk", 4)).toEqual(["↓", "↓↑", "↑", "↓↑"]);
    expect(guitarEvents("folk", 1, 4).map((e) => e.at)).toEqual([0, 0.5]);
  });

  it("put the kick and the bass on the strong beats", () => {
    expect([0, 1, 2, 3].map((b) => bandEvents(b, 4, "down").kick)).toEqual([true, false, true, false]);
    expect([0, 1, 2].map((b) => bandEvents(b, 3, "waltz").bass)).toEqual([true, false, false]);
  });
});
