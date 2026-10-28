import type { PracticeMode, Task } from "@/lib/music/path";

export const playHref = (song: string, mode: PracticeMode) => `/play/${song}?mode=${mode}`;
export const learnHref = (chord: string) => `/chords/${chord}`;
export const FRETBOARD_HREF = "/fretboard";
/** The path: home for a signed-in player. "/" is the presentation page. */
export const PATH_HREF = "/path";

export function taskHref(task: Task): string {
  switch (task.kind) {
    case "notes":
      return `${FRETBOARD_HREF}#drill`;
    case "learn":
      return learnHref(task.chord);
    case "step":
    case "timed":
      return playHref(task.song, task.kind);
  }
}

/** Shared button looks, so every primary action reads the same. */
export const button = {
  brass: "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-brass px-6 font-extrabold text-on-brass",
  primary: "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-primary px-6 font-extrabold text-on-primary",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-5 font-bold text-ink hover:border-ink",
};
