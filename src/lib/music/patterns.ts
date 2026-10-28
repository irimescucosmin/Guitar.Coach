import type { StrumPattern } from "./songs";

/**
 * What the guide guitar and the band play on one beat. Offsets are fractions
 * of a beat, so the scheduler only multiplies by the beat length.
 */

export type GuitarEvent =
  | { at: number; kind: "strum"; direction: "down" | "up"; strings: "all" | "treble" }
  | { at: number; kind: "bass"; alternate: boolean };

/** Down, down-up, up-down-up: the most common folk strum, on eighth notes. */
const FOLK: readonly ("D" | "U" | null)[] = ["D", null, "D", "U", null, "U", "D", "U"];

export function guitarEvents(pattern: StrumPattern, beat: number, beatsPerBar: number): GuitarEvent[] {
  const effective = beatsPerBar === 3 && pattern !== "down" ? "waltz" : pattern;
  switch (effective) {
    case "down":
      return [{ at: 0, kind: "strum", direction: "down", strings: "all" }];
    case "boomChick":
      if (beat % 2 === 0) return [{ at: 0, kind: "bass", alternate: beat % 4 === 2 }];
      return [{ at: 0, kind: "strum", direction: "down", strings: "treble" }];
    case "waltz":
      if (beat === 0) return [{ at: 0, kind: "bass", alternate: false }];
      return [{ at: 0, kind: "strum", direction: "down", strings: "treble" }];
    case "folk":
      return [0, 1].flatMap((half): GuitarEvent[] => {
        const stroke = FOLK[(beat * 2 + half) % FOLK.length];
        if (!stroke) return [];
        return [{ at: half / 2, kind: "strum", direction: stroke === "D" ? "down" : "up", strings: stroke === "D" ? "all" : "treble" }];
      });
  }
}

export interface BandBeat {
  kick: boolean;
  /** Hi-hat offsets within the beat. */
  hats: number[];
  /** Bass note on the chord root. */
  bass: boolean;
}

export function bandEvents(beat: number, beatsPerBar: number, pattern: StrumPattern): BandBeat {
  const strong = beat === 0 || (beatsPerBar === 4 && beat === 2);
  return {
    kick: strong,
    hats: pattern === "folk" ? [0, 0.5] : [0],
    bass: strong,
  };
}

/** The pattern written the way the screen shows it, one token per beat. */
export function patternSymbols(pattern: StrumPattern, beatsPerBar: number): string[] {
  return Array.from({ length: beatsPerBar }, (_, beat) =>
    guitarEvents(pattern, beat, beatsPerBar)
      .map((e) => (e.kind === "bass" ? "●" : e.direction === "down" ? "↓" : "↑"))
      .join(""),
  );
}
