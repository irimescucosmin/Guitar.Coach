import type { ChordId } from "./chords";
import { SUNG } from "./lyrics";

/**
 * The catalogue. Traditional songs are public domain and come with their
 * words (lyrics.ts), laid bar by bar over the chords; the "progression" group
 * carries only the chord sequence of well-known songs, which is what a
 * guitarist strums: never their words or melody.
 *
 * Practice versions: one chord per bar, a bar is `beatsPerBar` beats.
 */

export type StrumPattern = "down" | "boomChick" | "waltz" | "folk";
export type SongGroup = "exercise" | "traditional" | "progression";

export interface Section {
  name: "loop" | "verse" | "chorus";
  bars: readonly ChordId[];
  repeat: number;
  /**
   * What is sung over each bar, one row per repeat: only for songs in the
   * public domain (`SUNG` in lyrics.ts). A protected song never has words.
   */
  words?: readonly (readonly string[])[];
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

/** A traditional song as it is sung: its sections, bars and words from lyrics.ts. */
function sung(id: string): Section[] {
  const parts = SUNG[id];
  if (!parts) throw new Error(`No words for ${id}`);
  return parts.map((p) => ({ name: p.name, bars: p.bars, repeat: p.words.length, words: p.words }));
}

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
    sections: sung("skip-to-my-lou") },
  { id: "tom-dooley", title: "Tom Dooley", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("tom-dooley") },
  { id: "down-in-the-valley", title: "Down in the Valley", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: sung("down-in-the-valley") },
  { id: "will-the-circle", title: "Will the Circle Be Unbroken", origin: "hymn", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("will-the-circle") },
  { id: "oh-susanna", title: "Oh! Susanna", origin: "foster", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("oh-susanna") },
  { id: "red-river-valley", title: "Red River Valley", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("red-river-valley") },
  { id: "home-on-the-range", title: "Home on the Range", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: sung("home-on-the-range") },
  { id: "amazing-grace", title: "Amazing Grace", origin: "hymn", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: sung("amazing-grace") },
  { id: "drunken-sailor", title: "Drunken Sailor", origin: "shanty", group: "traditional", beatsPerBar: 4, pattern: "down",
    sections: sung("drunken-sailor") },
  { id: "camptown-races", title: "Camptown Races", origin: "foster", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("camptown-races") },
  { id: "clementine", title: "Oh My Darling, Clementine", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: sung("clementine") },
  { id: "coming-round-the-mountain", title: "She'll Be Coming 'Round the Mountain", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("coming-round-the-mountain") },
  { id: "when-the-saints", title: "When the Saints Go Marching In", origin: "spiritual", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("when-the-saints") },
  { id: "swing-low", title: "Swing Low, Sweet Chariot", origin: "spiritual", group: "traditional", beatsPerBar: 4, pattern: "folk",
    sections: sung("swing-low") },
  { id: "michael-row", title: "Michael, Row the Boat Ashore", origin: "spiritual", group: "traditional", beatsPerBar: 4, pattern: "folk",
    sections: sung("michael-row") },
  { id: "auld-lang-syne", title: "Auld Lang Syne", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "folk",
    sections: sung("auld-lang-syne") },
  { id: "scarborough-fair", title: "Scarborough Fair", origin: "traditional", group: "traditional", beatsPerBar: 3, pattern: "waltz",
    sections: sung("scarborough-fair") },
  { id: "tom-dooley-in-a", title: "Tom Dooley, in La", origin: "traditional", group: "traditional", beatsPerBar: 4, pattern: "boomChick",
    sections: sung("tom-dooley-in-a") },

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
  /** What is sung over this bar: undefined for a song without words, "" for a bar only strummed. */
  words?: string;
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
        ...(section.words ? { words: section.words[r]?.[i] ?? "" } : {}),
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

/** One line of words as it is shown while playing: four bars of one section pass. */
export interface LyricLine {
  first: number;
  last: number;
  /** Per bar, the words ready to read: syllable hyphens joined, and whether the word runs on into the next bar. */
  parts: { bar: number; text: string; runsOn: boolean }[];
}

const BARS_PER_LINE = 4;

/**
 * The lines of a song with words: four bars each, never across two sections,
 * and only the lines where something is sung. A song without words has none.
 */
export function lyricLines(bars: readonly Bar[]): LyricLine[] {
  const lines: LyricLine[] = [];
  let current: LyricLine | null = null;
  bars.forEach((bar, i) => {
    if (bar.words === undefined) return;
    if (!current || bar.opensSection || (bar.position - 1) % BARS_PER_LINE === 0) {
      current = { first: i, last: i, parts: [] };
      lines.push(current);
    }
    const raw = bar.words.trim();
    const runsOn = raw.endsWith("-");
    // "A-ma-zing" reads "Amazing"; "Doo-" keeps its hyphen out and runs into "ley".
    const text = (runsOn ? raw.slice(0, -1) : raw).replace(/(\p{L})-(?=\p{L})/gu, "$1");
    current.last = i;
    current.parts.push({ bar: i, text, runsOn });
  });
  return lines.filter((l) => l.parts.some((p) => p.text !== ""));
}
