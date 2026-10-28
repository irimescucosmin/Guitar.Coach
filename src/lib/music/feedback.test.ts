import { describe, expect, it } from "vitest";
import { fixFor, mutedStrings, openStrings, placementSteps } from "./feedback";

describe("feedback", () => {
  it("points at the finger when a fretted note is missing", () => {
    // C missing on a C chord: ring finger on the 5th string, 3rd fret.
    expect(fixFor("C", [0])).toEqual({ kind: "pressFinger", string: 1, finger: 3, fret: 3 });
  });

  it("points at the open string when only an open note is missing", () => {
    // G missing on Em: the open 3rd string, touched by a finger.
    expect(fixFor("Em", [7])).toEqual({ kind: "freeOpenString", string: 3 });
  });

  it("has nothing to say when nothing is missing", () => {
    expect(fixFor("G", [])).toBeNull();
  });

  it("places fingers index first", () => {
    expect(placementSteps("Am").map((s) => s.finger)).toEqual([1, 2, 3]);
    expect(placementSteps("G")[0]).toEqual({ finger: 1, string: 1, fret: 2 });
  });

  it("lists open and muted strings", () => {
    expect(openStrings("D")).toEqual([2]);
    expect(mutedStrings("D")).toEqual([0, 1]);
  });
});
