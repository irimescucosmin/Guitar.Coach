import type { ChordId } from "./chords";

/**
 * The catalogue. Only chords and structure live here, never lyrics or melody:
 * traditional songs are public domain, the "progression" group carries only the
 * chord sequence of well-known songs, which is what a guitarist strums.
 *
 * Practice versions: one chord per bar, a bar is `beatsPerBar` beats.
 */

export type StrumPattern = "down" | "boomChick" | "waltz" | "folk";
export type SongGroup = "exercise" | "traditional" | "progression";

export interface Section {
  name: "loop" | "verse" | "chorus";
  bars: readonly ChordId[];
  repeat: number;
}

export interface Song {
  id: string;
  title: string;
  /** Who wrote it or where it comes from; shown under the title. */
  origin: "exercise" | "traditional" | "hymn" | "spiritual" | "foster" | "shanty" | "chordsOnly";
  group: SongGroup;
  beatsPerBar: 3 | 4;
  pattern: StrumPattern;
  sections: readonly Section[];
}

const twice = (name: Section["name"], bars: readonly ChordId[]): Section => ({ name, bars, repeat: 2 });

export const SONGS: readonly Song[] = [
  // Exercises: one change, repeated until it stops being a decision.
  { id: "drill-em-am", title: "Em ↔ Am", origin: "exercise", group: "exercise", beatsPerBar: 4, pattern: "down",
    sections: [{ name: "loop", bars: ["Em", "Em", "Am", "Am"], repeat: 4 }] },
  { id: "drill-g-d", title: "G ↔ D", origin: "exercise", group: "exercise", beatsPerBar: 4, pattern: "down",
    sections: [{ name: "loop", bars: ["G", "G", "D", "D"], repeat: 4 }] },
  { id: "drill-g-c-d", title: "G C D", origin: "exercise", group: "exercise", beatsPerBar: 4, pattern: "down",
    sections: [twice("loop", ["G", "C", "G", "D", "G", "C", "D", "G"])] },
  { id: "drill-dm-c", title: "Dm ↔ C", origin: "exercise", group: "exercise", beatsPerBar: 4, pattern: "down",
    sections: [{ name: "loop", bars: ["Dm", "Dm", "C", "C"], repeat: 4 }] },
  { id: "drill-e-a", title: "E ↔ A", origin: "exercise", group: "exercise", beatsPerBar: 4, pattern: "down",
    sections: [{ name: "loop", bars: ["E", "E", "A", "A"], repeat: 4 }] },

  // Traditional, public domain.
  { id: "skip-to-my-lou", title: "Skip to My Lou", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "down",
    sections: [twice("verse", ["G", "G", "D", "D", "G", "G", "D", "G"]), twice("chorus", ["G", "G", "D", "D", "G", "G", "D", "G"])] },
  { id: "tom-dooley", title: "Tom Dooley", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("chorus", ["G", "G", "D", "D", "D", "D", "G", "G"]), twice("verse", ["G", "G", "D", "D", "D", "D", "G", "G"])] },
  { id: "down-in-the-valley", title: "Down in the Valley", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: [{ name: "verse", bars: ["G", "G", "G", "D", "D", "D", "D", "G"], repeat: 3 }] },
  { id: "will-the-circle", title: "Will the Circle Be Unbroken", origin: "hymn", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "G", "C", "G", "G", "G", "D", "G"]), twice("chorus", ["G", "G", "C", "G", "G", "G", "D", "G"])] },
  { id: "oh-susanna", title: "Oh! Susanna", origin: "foster", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "G", "G", "D", "G", "G", "D", "G"]), { name: "chorus", bars: ["C", "C", "G", "D", "G", "G", "D", "G"], repeat: 1 }] },
  { id: "red-river-valley", title: "Red River Valley", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "G", "G", "G", "D", "D", "D", "D", "G", "G", "C", "C", "D", "D", "G", "G"])] },
  { id: "home-on-the-range", title: "Home on the Range", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: [
      { name: "verse", bars: ["G", "G", "C", "C", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"], repeat: 1 },
      { name: "chorus", bars: ["D", "D", "G", "G", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"], repeat: 1 },
    ] },
  { id: "amazing-grace", title: "Amazing Grace", origin: "hymn", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: [twice("verse", ["G", "G", "C", "G", "G", "G", "D", "D", "G", "G", "C", "G", "G", "D", "G", "G"])] },
  { id: "drunken-sailor", title: "Drunken Sailor", origin: "shanty", group: "traditional", beatsPerBar: 4, pattern: "down",
    sections: [twice("verse", ["Dm", "Dm", "C", "C", "Dm", "Dm", "C", "Dm"]), twice("chorus", ["Dm", "Dm", "C", "C", "Dm", "Dm", "C", "Dm"])] },
  { id: "camptown-races", title: "Camptown Races", origin: "foster", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "G", "D", "G", "G", "G", "D", "G"]), twice("chorus", ["G", "C", "G", "D", "G", "C", "D", "G"])] },
  { id: "clementine", title: "Oh My Darling, Clementine", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: [twice("verse", ["G", "G", "G", "D", "D", "G", "D", "G"]), twice("chorus", ["G", "G", "G", "D", "D", "G", "D", "G"])] },
  { id: "coming-round-the-mountain", title: "She'll Be Coming 'Round the Mountain", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "G", "G", "G", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"])] },
  { id: "when-the-saints", title: "When the Saints Go Marching In", origin: "spiritual", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "G", "G", "G", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"])] },
  { id: "swing-low", title: "Swing Low, Sweet Chariot", origin: "spiritual", group: "traditional", beatsPerBar: 4, pattern: "folk",
    sections: [twice("chorus", ["G", "C", "G", "D", "G", "C", "D", "G"]), twice("verse", ["G", "C", "G", "D", "G", "C", "D", "G"])] },
  { id: "michael-row", title: "Michael, Row the Boat Ashore", origin: "spiritual", group: "traditional", beatsPerBar: 4, pattern: "folk",
    sections: [{ name: "verse", bars: ["G", "C", "G", "G", "Em", "Am", "D", "G"], repeat: 4 }] },
  { id: "auld-lang-syne", title: "Auld Lang Syne", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "folk",
    sections: [twice("verse", ["G", "D", "G", "C", "G", "Em", "D", "G"]), twice("chorus", ["G", "D", "G", "C", "G", "Em", "D", "G"])] },
  { id: "scarborough-fair", title: "Scarborough Fair", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: [{ name: "verse", bars: ["Am", "Am", "G", "Am", "C", "Am", "D", "Am", "Am", "C", "G", "Am", "G", "Am", "G", "Am"], repeat: 3 }] },
  { id: "tom-dooley-in-a", title: "Tom Dooley (La)", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("chorus", ["A", "A", "E", "E", "E", "E", "A", "A"]), twice("verse", ["A", "A", "E", "E", "E", "E", "A", "A"])] },

  // Chord progressions of well-known songs. No lyrics, no melody.
  { id: "wagon-wheel", title: "Wagon Wheel", origin: "chordsOnly", group: "progression", beatsPerBar: 4, pattern: "folk",
    sections: [twice("verse", ["G", "D", "Em", "C", "G", "D", "C", "C"]), twice("chorus", ["G", "D", "Em", "C", "G", "D", "C", "C"])] },
  { id: "ring-of-fire", title: "Ring of Fire", origin: "chordsOnly", group: "progression", beatsPerBar: 4, pattern: "boomChick",
    sections: [twice("verse", ["G", "C", "G", "G", "G", "D", "G", "G"]), twice("chorus", ["D", "C", "G", "G", "G", "D", "G", "G"])] },
  { id: "country-roads", title: "Take Me Home, Country Roads", origin: "chordsOnly", group: "progression", beatsPerBar: 4, pattern: "folk",
    sections: [twice("verse", ["G", "Em", "D", "C", "G", "G"]), twice("chorus", ["G", "D", "Em", "C", "G", "D", "C", "G"])] },
  { id: "jolene", title: "Jolene", origin: "chordsOnly", group: "progression", beatsPerBar: 4, pattern: "down",
    sections: [twice("chorus", ["Am", "C", "G", "Am", "G", "Em", "Am", "Am"]), twice("verse", ["Am", "C", "G", "Am", "G", "Em", "Am", "Am"])] },
];

const BY_ID = new Map(SONGS.map((s) => [s.id, s]));

export function findSong(id: string): Song | undefined {
  return BY_ID.get(id);
}

export function chordsOf(song: Song): ChordId[] {
  return [...new Set(song.sections.flatMap((s) => s.bars))];
}

export interface Bar {
  chord: ChordId;
  section: Section["name"];
  /** 1-based repetition of its section, 0 when the section plays once. */
  pass: number;
  /** True on the first bar of a section pass. */
  opensSection: boolean;
  /** 1-based place of the bar in its section pass, and how many bars the pass has. */
  position: number;
  passLength: number;
}

export function barsOf(song: Song): Bar[] {
  return song.sections.flatMap((section) =>
    Array.from({ length: section.repeat }, (_, r) =>
      section.bars.map((chord, i) => ({
        chord,
        section: section.name,
        pass: section.repeat > 1 ? r + 1 : 0,
        opensSection: i === 0,
        position: i + 1,
        passLength: section.bars.length,
      })),
    ).flat(),
  );
}

/** Consecutive equal bars collapse into one step: what step mode waits on. */
export interface Step {
  chord: ChordId;
  firstBar: number;
  bars: number;
}

export function stepsOf(bars: readonly Bar[]): Step[] {
  const steps: Step[] = [];
  bars.forEach((bar, i) => {
    const last = steps.at(-1);
    if (last && last.chord === bar.chord) last.bars += 1;
    else steps.push({ chord: bar.chord, firstBar: i, bars: 1 });
  });
  return steps;
}

/** Index of the next bar after `from` whose chord differs, or -1. */
export function nextChangeAfter(bars: readonly Bar[], from: number): number {
  const current = bars[from]?.chord;
  for (let i = Math.max(from + 1, 0); i < bars.length; i++) {
    if (bars[i]!.chord !== current) return i;
  }
  return -1;
}
