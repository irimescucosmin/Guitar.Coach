/**
 * The problems almost every beginner meets, grouped as a player would look
 * for them: by what they hear or feel. The words live in `messages` (help.p.<id>);
 * here only the structure, and where in the app each one is worked on.
 * Research and sources: docs/PROBLEMI.md.
 */

export const HELP_GROUPS = ["sound", "hands", "changes", "strumming", "time", "guitar", "practice"] as const;
export type HelpGroup = (typeof HELP_GROUPS)[number];

export interface Problem {
  id: string;
  group: HelpGroup;
  /** How many "what to do" steps it has: keys fix1..fixN. */
  fixes: number;
  /** Where the app works on it, if anywhere. */
  app?: { href: string; label: "learn" | "tuner" | "changes" | "today" | "play" | "songs" | "fretboard" };
  /** Pain that may need a doctor: shown with a warning. */
  warn?: boolean;
}

export const PROBLEMS: readonly Problem[] = [
  { id: "buzz", group: "sound", fixes: 3, app: { href: "/chords", label: "learn" } },
  { id: "muted", group: "sound", fixes: 3, app: { href: "/chords", label: "learn" } },
  { id: "soundsWrong", group: "sound", fixes: 3, app: { href: "/tools#tuner", label: "tuner" } },
  { id: "detunes", group: "sound", fixes: 3, app: { href: "/tools#tuner", label: "tuner" } },
  { id: "fingertips", group: "hands", fixes: 3, app: { href: "/today", label: "today" } },
  { id: "thumb", group: "hands", fixes: 3 },
  { id: "pain", group: "hands", fixes: 3, warn: true },
  { id: "stretch", group: "hands", fixes: 3, app: { href: "/today", label: "today" } },
  { id: "slowChanges", group: "changes", fixes: 3, app: { href: "/tools#changes", label: "changes" } },
  { id: "stopsAtChange", group: "changes", fixes: 3, app: { href: "/songs", label: "songs" } },
  { id: "barre", group: "changes", fixes: 3 },
  { id: "wrongStrings", group: "strumming", fixes: 3 },
  { id: "pick", group: "strumming", fixes: 2 },
  { id: "stiffStrum", group: "strumming", fixes: 3, app: { href: "/songs", label: "songs" } },
  { id: "tempo", group: "time", fixes: 3, app: { href: "/songs", label: "songs" } },
  { id: "hardToPlay", group: "guitar", fixes: 3 },
  { id: "strings", group: "guitar", fixes: 2 },
  { id: "noProgress", group: "practice", fixes: 4, app: { href: "/today", label: "today" } },
  { id: "discouraged", group: "practice", fixes: 3, app: { href: "/today", label: "today" } },
];

export const problemsIn = (group: HelpGroup) => PROBLEMS.filter((p) => p.group === group);
export const findProblem = (id: string) => PROBLEMS.find((p) => p.id === id);
