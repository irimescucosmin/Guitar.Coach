import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, type Progress } from "./path";
import { arpeggioDone, arpeggioId, arpeggioNotes, arpeggioStep, arpeggiosHeard, songsWithPattern, strumProvedBy } from "./techniques";

describe("techniques", () => {
  it("spells an arpeggio bass first and moves on only at the expected note", () => {
    expect(arpeggioNotes("Em")).toEqual([40, 47, 52, 55, 59, 64]);
    expect(arpeggioNotes("D")).toEqual([50, 57, 62, 66]); // four strings played
    let at = 0;
    at = arpeggioStep("Em", at, 40);
    expect(at).toBe(1);
    at = arpeggioStep("Em", at, 52); // the third string: not yet
    expect(at).toBe(1);
    at = arpeggioStep("Em", at, 52 + 12); // an octave off is another string
    expect(at).toBe(1);
    for (const n of [47, 52, 55, 59, 64]) at = arpeggioStep("Em", at, n);
    expect(arpeggioDone("Em", at)).toBe(true);
    expect(arpeggioStep("Em", at, 40)).toBe(at);
  });

  it("knows which songs carry a strum, and which saved result proves it", () => {
    const p: Progress = { ...EMPTY_PROGRESS, learned: { G: true, D: true, C: true }, best: { "tom-dooley": { timed: 0.75 }, "arp-Em": { step: 4200 } } };
    const folk = songsWithPattern("folk", p);
    expect(folk.length).toBeGreaterThan(0);
    expect(folk.every((s) => s.pattern === "folk" && s.group !== "exercise")).toBe(true);
    expect(strumProvedBy("boomChick", p)?.id).toBe("tom-dooley");
    expect(strumProvedBy("folk", p)).toBeNull();
    expect(strumProvedBy("boomChick", { ...p, best: { "tom-dooley": { timed: 0.5 } } })).toBeNull();
    expect(arpeggiosHeard(p)).toEqual([{ chord: "Em", ms: 4200 }]);
    expect(arpeggioId("Am")).toBe("arp-Am");
  });
});
