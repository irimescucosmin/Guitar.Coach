import type { PracticeMode, Task } from "@/lib/music/path";

export const playHref = (song: string, mode: PracticeMode) => `/play/${song}?mode=${mode}`;
export const learnHref = (chord: string) => `/chords/${chord}`;

export function taskHref(task: Task): string {
  return task.kind === "learn" ? learnHref(task.chord) : playHref(task.song, task.kind);
}
