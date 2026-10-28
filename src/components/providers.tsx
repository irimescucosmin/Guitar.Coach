"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { importGuest, saveLearnedChord, savePracticeRun } from "@/app/actions";
import type { ChordId } from "@/lib/music/chords";
import { EMPTY_PROGRESS, recordResult, type Progress } from "@/lib/music/path";
import { guestProgress, toProgress, type RunInput } from "@/lib/progress/validation";

/* ---------- local storage, always behind try/catch: private windows refuse it ---------- */

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
}

const ProgressContext = createContext<ProgressApi>({
  progress: EMPTY_PROGRESS,
  signedIn: false,
  learn: () => {},
  record: () => false,
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

  // A guest keeps progress in this browser. After signing in, it joins the account once.
  useEffect(() => {
    const parsed = guestProgress.safeParse(readJson(GUEST_KEY));
    if (!parsed.success) return;
    if (!signedIn) {
      setProgress(toProgress(parsed.data));
      return;
    }
    void importGuest(parsed.data).then((result) => {
      if (result.saved) {
        writeJson(GUEST_KEY, null);
        setProgress(result.progress);
      }
    });
  }, [signedIn]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeJson(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const persistGuest = useCallback(
    (next: Progress) => {
      if (!signedIn) writeJson(GUEST_KEY, next);
    },
    [signedIn],
  );

  const learn = useCallback(
    (chord: ChordId) => {
      setProgress((p) => {
        const next = { ...p, learned: { ...p.learned, [chord]: true as const } };
        persistGuest(next);
        return next;
      });
      if (signedIn) void saveLearnedChord(chord).then((r) => r.saved && setProgress(r.progress));
    },
    [signedIn, persistGuest],
  );

  const record = useCallback(
    (run: RunInput) => {
      const { progress: next, isRecord } = recordResult(progress, run.songId, run.mode, run.value);
      setProgress(next);
      persistGuest(next);
      if (signedIn) void savePracticeRun(run).then((r) => r.saved && setProgress(r.progress));
      return isRecord;
    },
    [progress, signedIn, persistGuest],
  );

  const progressApi = useMemo(() => ({ progress, signedIn, learn, record }), [progress, signedIn, learn, record]);
  const settingsApi = useMemo(() => ({ settings, update }), [settings, update]);

  return (
    <SettingsContext.Provider value={settingsApi}>
      <ProgressContext.Provider value={progressApi}>{children}</ProgressContext.Provider>
    </SettingsContext.Provider>
  );
}
