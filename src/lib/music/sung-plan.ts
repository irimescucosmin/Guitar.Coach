import { barsOf, lyricLines, type Song } from "./songs";

/**
 * The composition plan for a sung version of a traditional song, in the
 * shape ElevenLabs' music API takes (POST /v1/music, `composition_plan`).
 *
 * The API has no field for chords, tempo or key: they go in as style words,
 * and each section's length is fixed to the bars it has at the given tempo,
 * so the song keeps its structure. Whether the result follows the chords is
 * checked after, by ear and by `scripts/sung.ts --check`. The sung version is
 * something to listen to, never what the microphone is judged against.
 *
 * Pure: the script does the network and the files.
 */

export const SUNG_BPM = 90;

export interface PlanSection {
  section_name: string;
  positive_local_styles: string[];
  negative_local_styles: string[];
  duration_ms: number;
  lines: string[];
}

export interface CompositionPlan {
  positive_global_styles: string[];
  negative_global_styles: string[];
  sections: PlanSection[];
}

const KEY_OF: Record<string, string> = { G: "G major", C: "C major", D: "D major", A: "A major", E: "E major", Em: "E minor", Am: "A minor", Dm: "D minor" };

/** The key a song sits in: the chord it ends on, which for these songs is the tonic. */
export function keyOf(song: Song): string {
  const last = barsOf(song).at(-1)!.chord;
  return KEY_OF[last]!;
}

export function compositionPlan(song: Song, bpm = SUNG_BPM): CompositionPlan {
  const bars = barsOf(song);
  const lines = lyricLines(bars);
  const barMs = (song.beatsPerBar * 60_000) / bpm;
  const sections: PlanSection[] = [];
  bars.forEach((bar, i) => {
    if (!bar.opensSection) return;
    const end = i + bar.passLength - 1;
    const chords = bars.slice(i, end + 1).map((b) => b.chord);
    const sung = lines.filter((l) => l.first >= i && l.last <= end);
    const name = bar.section === "chorus" ? "Chorus" : "Verse";
    sections.push({
      section_name: `${name} ${sections.filter((s) => s.section_name.startsWith(name)).length + 1}`,
      positive_local_styles: [
        `chords bar by bar: ${chords.join(" ")}`,
        sung.length === 0 ? "instrumental, guitar only" : "sung clearly, one syllable per note",
      ],
      negative_local_styles: sung.length === 0 ? ["vocals"] : [],
      duration_ms: Math.round(barMs * bar.passLength),
      lines: sung.map((l) => l.parts.map((p) => p.text + (p.text && !p.runsOn ? " " : "")).join("").trim()),
    });
  });
  return {
    positive_global_styles: [
      "traditional folk song",
      "solo acoustic steel-string guitar, strummed",
      "one warm natural voice",
      `${bpm} bpm, steady tempo`,
      `${song.beatsPerBar}/4 time`,
      `key of ${keyOf(song)}`,
      "simple open chords, no passing chords",
    ],
    negative_global_styles: ["drums", "bass", "electric guitar", "synth", "autotune", "key change", "tempo change"],
    sections,
  };
}
