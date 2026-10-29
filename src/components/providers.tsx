"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { importGuest, loadToday, reportProof, saveAnswers, saveChanges, saveLearnedChord, savePracticeRun, type Today } from "@/app/actions";
import type { ChordId } from "@/lib/music/chords";
import { EMPTY_PROGRESS, recordResult, type Progress } from "@/lib/music/path";
import { placedChords, type Profile } from "@/lib/music/profile";
import { localDate, pairKey } from "@/lib/music/routine";
import { guestProgress, type RunInput } from "@/lib/progress/validation";

/* ---------- local storage, always behind try/catch: private windows refuse it ---------- */

/** Where progress lived before accounts were required; read once to import it. */

const GUEST_KEY = "guitar-coach:progress";
const SETTINGS_KEY = "guitar-coach:settings";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* the page works without it */
  }
}

/* ---------- settings ---------- */

interface Settings {
  leftHanded: boolean;
  volume: number;
  bpm: number;
}

const DEFAULT_SETTINGS: Settings = { leftHanded: false, volume: 0.8, bpm: 100 };

const SettingsContext = createContext<{ settings: Settings; update: (patch: Partial<Settings>) => void }>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

/* ---------- progress ---------- */

interface ProgressApi {
  progress: Progress;
  signedIn: boolean;
  learn: (chord: ChordId) => void;
  /** Stores a finished run; resolves with whether it beat the previous best. */
  record: (run: RunInput) => boolean;
  /** Stores the questionnaire's answers and learns the chords they place; resolves once saved. */
  answer: (profile: Profile) => Promise<void>;
  /** Stores a one-minute change test; returns whether it beat the previous best for that pair. */
  recordChanges: (a: ChordId, b: ChordId, count: number) => boolean;
  /** Today's routine as far as it is done, on the player's own date; null until loaded. */
  today: (Today & { date: string }) | null;
  /** The microphone proved tuning or the warm-up: the server ticks today's block. */
  prove: (proof: "tuned" | "warmup") => void;
}

const ProgressContext = createContext<ProgressApi>({
  progress: EMPTY_PROGRESS,
  signedIn: false,
  learn: () => {},
  record: () => false,
  answer: async () => {},
  recordChanges: () => false,
  today: null,
  prove: () => {},
});

export function useProgress() {
  return useContext(ProgressContext);
}

export function Providers({ initialProgress, children }: { initialProgress: Progress | null; children: ReactNode }) {
  const signedIn = initialProgress !== null;
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(initialProgress ?? EMPTY_PROGRESS);

  useEffect(() => {
    const stored = readJson(SETTINGS_KEY);
    if (stored && typeof stored === "object") setSettings((s) => ({ ...s, ...(stored as Partial<Settings>) }));
  }, []);

  // Server progress is the truth for an account; a refresh brings a new one.
  useEffect(() => {
    if (initialProgress) setProgress(initialProgress);
  }, [initialProgress]);

  // Before accounts were required, progress lived in this browser. It joins the
  // account once, on the first signed-in visit, and the browser copy goes.
  useEffect(() => {
    if (!signedIn) {
      // Also after signing out: nothing of the account stays on screen.
      setProgress(EMPTY_PROGRESS);
      return;
    }
    const parsed = guestProgress.safeParse(readJson(GUEST_KEY));
    if (!parsed.success) return;
    // Taken out before the call, so a second tab or a re-run does not import it twice.
    writeJson(GUEST_KEY, null);
    importGuest(parsed.data)
      .then((result) => {
        if (result.saved) setProgress(result.progress);
        else writeJson(GUEST_KEY, parsed.data);
      })
      .catch(() => writeJson(GUEST_KEY, parsed.data));
  }, [signedIn]);

  // Today's routine: loaded once signed in, then kept up to date by what the player does.
  const [today, setToday] = useState<(Today & { date: string }) | null>(null);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  const todayRef = useRef(today);
  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  useEffect(() => {
    if (!signedIn) {
      setToday(null);
      return;
    }
    const date = localDate(new Date());
    void loadToday(date).then((t) => t && setToday({ ...t, date }));
  }, [signedIn]);

  /** Results carry today's date; the server answers with today's ticks. */
  const landed = useCallback((r: Awaited<ReturnType<typeof savePracticeRun>>, date: string) => {
    if (!r.saved) return;
    setProgress(r.progress);
    if (r.today) setToday({ ...r.today, date });
  }, []);

  const prove = useCallback(
    (proof: "tuned" | "warmup") => {
      if (!signedIn) return;
      const date = localDate(new Date());
      void reportProof({ day: date, proof }).then((t) => t && setToday({ ...t, date }));
    },
    [signedIn],
  );

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeJson(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const learn = useCallback(
    (chord: ChordId) => {
      setProgress((p) => {
        return { ...p, learned: { ...p.learned, [chord]: true as const } };
      });
      const date = localDate(new Date());
      void saveLearnedChord(chord, date).then((r) => landed(r, date));
    },
    [landed],
  );

  const record = useCallback(
    (run: RunInput) => {
      const { progress: next, isRecord } = recordResult(progress, run.songId, run.mode, run.value);
      setProgress(next);
      const date = localDate(new Date());
      void savePracticeRun(run, date).then((r) => landed(r, date));
      return isRecord;
    },
    [progress, landed],
  );

  const recordChanges = useCallback(
    (a: ChordId, b: ChordId, count: number) => {
      const pair = pairKey(a, b);
      const previous = progress.changes?.[pair];
      const isRecord = previous === undefined || count > previous;
      if (isRecord) setProgress({ ...progress, changes: { ...progress.changes, [pair]: count } });
      const date = localDate(new Date());
      void saveChanges({ pair, count }, date).then((r) => landed(r, date));
      return isRecord;
    },
    [progress, landed],
  );

  const answer = useCallback(
    async (profile: Profile) => {
      setProgress((p) => {
        const learned = { ...p.learned };
        for (const chord of placedChords(profile)) learned[chord] = true;
        return { ...p, learned, profile };
      });
      // Awaited by the caller: a page loaded before the save lands would show the path without the answers.
      const result = await saveAnswers(profile);
      if (result.saved) setProgress(result.progress);
    },
    [],
  );

  const progressApi = useMemo(
    () => ({ progress, signedIn, learn, record, answer, recordChanges, today, prove }),
    [progress, signedIn, learn, record, answer, recordChanges, today, prove],
  );
  const settingsApi = useMemo(() => ({ settings, update }), [settings, update]);

  return (
    <SettingsContext.Provider value={settingsApi}>
      <ProgressContext.Provider value={progressApi}>{children}</ProgressContext.Provider>
    </SettingsContext.Provider>
  );
}
