"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useProgress, useSettings } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { IconCheck, IconPlay } from "@/components/ui/icons";
import { button, playHref, taskHref } from "@/components/ui/links";
import { CHORD_IDS, type ChordId } from "@/lib/music/chords";
import { LESSONS, PASS_SCORE, lessonStates, nextTask, type Lesson, type Task } from "@/lib/music/path";
import { patternSymbols } from "@/lib/music/patterns";
import { needsRecheck } from "@/lib/music/profile";
import { FirstRun, TodayStrip } from "@/components/today/today-view";
import { chordsOf, findSong } from "@/lib/music/songs";

/** Best one-minute change test, kept by the tools page in this browser. */
function bestChangeTest(): number | null {
  try {
    let best: number | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("guitar-coach:change-test:")) continue;
      const value = Number(localStorage.getItem(key));
      if (Number.isFinite(value)) best = Math.max(best ?? 0, value);
    }
    return best;
  } catch {
    return null;
  }
}

/** Low E to high E, as they are named in lesson 0. */
const OPEN_STRING_PITCHES = [4, 9, 2, 7, 11, 4];

export function PathView() {
  const t = useTranslations("path");
  const tc = useTranslations("common");
  const tp = useTranslations("play");
  const { progress } = useProgress();
  const { settings } = useSettings();
  const [changes, setChanges] = useState<number | null>(null);
  useEffect(() => setChanges(bestChangeTest()), []);
  // Read after mount: the clock differs between server and browser.
  const [recheck, setRecheck] = useState(false);
  useEffect(() => setRecheck(progress.profile ? needsRecheck(progress.profile, new Date()) : false), [progress.profile]);

  const task = nextTask(progress);
  const states = lessonStates(progress);
  const currentIndex = task ? LESSONS.findIndex((l) => l.id === task.lesson) : LESSONS.length - 1;
  const current = states[currentIndex]!;
  const score = Math.round(PASS_SCORE * 100);
  const learnedCount = CHORD_IDS.filter((c) => progress.learned[c]).length;
  const bestTimed = Object.values(progress.best).reduce((m, b) => Math.max(m, b?.timed ?? 0), 0);
  const songTitle = (id: string) => findSong(id)?.title ?? id;
  const lessonName = (l: Lesson) => t(`lessonTitle.${l.id}`);

  const taskTitle = (task: Task) => {
    switch (task.kind) {
      case "notes": return t("notesTitle");
      case "learn": return t("learn", { chord: task.chord });
      case "step": return t("step", { song: songTitle(task.song) });
      case "timed": return t("timed", { song: songTitle(task.song) });
    }
  };
  const taskBody = (task: Task) => {
    switch (task.kind) {
      case "notes": return t("notesBody");
      case "learn": return t("learnBody");
      case "step": return t("stepBody");
      case "timed": return t("timedBody", { score });
    }
  };
  const taskLine = (task: Task) => {
    switch (task.kind) {
      case "notes": return t("taskNotes");
      case "learn": return t("taskLearn", { chord: task.chord });
      case "step": return t("taskStep");
      case "timed": return t("taskTimed", { score });
    }
  };
  const taskChords = (task: Task): ChordId[] =>
    task.kind === "learn" ? [task.chord] : task.kind === "notes" ? [] : chordsOf(findSong(task.song)!);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">
            {t("lesson", { n: currentIndex })} · {lessonName(current.lesson)}
          </span>
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        </div>
        <Link href="/songs" className={`${button.outline} h-11`}>{t("allSongs")}</Link>
      </header>


      {progress.profile ? <TodayStrip /> : <FirstRun />}
      {progress.profile && (
        <p className="m-0 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
          {recheck ? t("recheck") : t("retake")}
          <Link href="/start" className="font-bold text-brass-ink underline-offset-2 hover:underline">{t("recheckGo")}</Link>
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section aria-labelledby="next-step" className="flex flex-wrap items-center gap-7 rounded-[var(--radius-hero)] bg-navy p-7 text-on-navy lg:col-span-2">
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <span id="next-step" className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-brass">{t("nextStep")}</span>
              {task && <span className="font-mono text-xs text-on-navy-muted">{t("tasks", { done: current.done + 1, total: current.total })}</span>}
            </div>
            {task ? (
              <>
                <h2 className="display m-0 text-[32px] font-extrabold leading-[1.1]">{taskTitle(task)}</h2>
                <p className="m-0 max-w-[42ch] text-base leading-relaxed text-on-navy-muted">{taskBody(task)}</p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <Link href={taskHref(task)} className={`${button.brass} h-[52px] text-[17px]`}>
                    <IconPlay />
                    {t("start")}
                  </Link>
                  {(task.kind === "step" || task.kind === "timed") && (
                    <Link href={playHref(task.song, "listen")} className="inline-flex h-[52px] items-center rounded-[var(--radius-control)] border border-navy-line px-5 font-bold text-on-navy">
                      {t("listenFirst")}
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <p className="m-0 max-w-[48ch] text-lg">{t("allDone")}</p>
            )}
          </div>
          {task && task.kind !== "notes" && (
            <div className="flex gap-3">
              {taskChords(task).slice(0, 3).map((c) => (
                <figure key={c} className="m-0 flex flex-col items-center gap-1.5 rounded-[16px] bg-surface px-2.5 pb-2.5 pt-3 text-ink">
                  <ChordDiagram chord={c} width={110} leftHanded={settings.leftHanded} title={tc("diagram", { chord: c, name: tc(`chord.${c}`) })} />
                  <figcaption className="text-xl font-extrabold" style={{ color: `var(--color-chord-${c})` }}>{c}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {task?.kind === "notes" && (
            <ol className="m-0 flex list-none gap-1.5 p-0" aria-label={t("openStrings")}>
              {OPEN_STRING_PITCHES.map((pc, i) => (
                <li key={i} className="flex h-14 w-12 items-center justify-center rounded-[12px] bg-surface font-extrabold text-ink">{tc(`pitch.p${pc as 0}`)}</li>
              ))}
            </ol>
          )}
        </section>

        <section aria-label={t("numbers")} className="grid grid-rows-3 gap-3">
          <Stat label={t("statChords")} value={<>{learnedCount}<span className="text-base text-muted">/{CHORD_IDS.length}</span></>} />
          <Stat label={t("statChanges")} value={changes === null ? "–" : String(changes)} />
          <Stat label={t("statTimed")} value={bestTimed > 0 ? `${Math.round(bestTimed * 100)}%` : "–"} />
        </section>
      </div>

      <section className="flex flex-col gap-3.5">
        <h2 className="eyebrow m-0 text-muted">{t("lessons")}</h2>
        <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-6">
          {states.map(({ lesson, done, total, complete }, i) => {
            const isCurrent = i === currentIndex && !complete;
            return (
              <li
                key={lesson.id}
                className={`flex flex-col gap-3 rounded-[16px] bg-surface p-4 ${isCurrent ? "border-2 border-primary" : "border border-line"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] text-muted">{String(i).padStart(2, "0")}</span>
                  <span className={`text-xs font-bold ${complete ? "text-good" : isCurrent ? "text-brass-ink" : "font-semibold text-muted"}`}>
                    {complete ? t("complete") : isCurrent ? t("inProgress", { done, total }) : t("notStarted")}
                  </span>
                </div>
                <Link href={lesson.id === "notes" ? "/fretboard" : taskHref({ kind: "learn", lesson: lesson.id, chord: lesson.newChords[0]! })} className="text-[17px] font-extrabold leading-tight hover:underline">
                  {lessonName(lesson)}
                </Link>
                <div className="flex flex-wrap gap-1">
                  {lesson.newChords.length > 0
                    ? lesson.newChords.map((c) => <ChordChip key={c} chord={c} />)
                    : <span className="rounded-[6px] bg-subtle px-2 py-0.5 text-xs font-bold">Mi La Re Sol Si Mi</span>}
                </div>
                <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <div className={`h-full ${complete ? "bg-good" : "bg-brass"}`} style={{ width: `${(done / total) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={`grid grid-cols-1 gap-5 ${current.lesson.songs.length > 0 ? "lg:grid-cols-2" : ""}`}>
        <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="m-0 text-xl font-extrabold">{t("lessonLeft", { n: currentIndex })}</h2>
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {current.tasks.map(({ task: item, done }) => {
              const isNext = task !== null && JSON.stringify(item) === JSON.stringify(task);
              return (
                <li key={JSON.stringify(item)}>
                  <Link href={taskHref(item)} className={`flex min-h-11 items-center gap-3 text-[15px] ${done ? "text-muted" : isNext ? "font-bold" : ""}`}>
                    {done ? (
                      <span className="flex size-[22px] items-center justify-center rounded-[6px] bg-good text-white"><IconCheck size={14} /></span>
                    ) : (
                      <span className={`size-[22px] rounded-[6px] border-2 ${isNext ? "border-brass" : "border-line-strong"}`} />
                    )}
                    <span className={done ? "line-through" : ""}>{taskLine(item)}</span>
                    {isNext && <span className="ml-auto text-[13px] font-bold text-brass-ink">{t("now")}</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="m-0 rounded-[12px] bg-subtle px-4 py-3.5 text-sm leading-relaxed text-ink-2">{t(`lessonTip.${current.lesson.id}`)}</p>
        </section>

        {current.lesson.songs.length > 0 && (
          <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 className="m-0 text-xl font-extrabold">{t("songsWith", { chords: current.lesson.newChords.join(t("and")) })}</h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {current.lesson.songs.slice(0, 5).map((id) => {
                const song = findSong(id)!;
                return (
                  <li key={id} className="flex min-h-14 items-center gap-3 border-b border-line last:border-b-0">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-bold">{song.title}</span>
                      <span className="text-[13px] text-muted">
                        {tp(`origin.${song.origin}`)} · <span className="font-mono">{patternSymbols(song.pattern, song.beatsPerBar).join(" ")}</span>
                      </span>
                    </div>
                    <Link href={playHref(id, "listen")} className={`${button.outline} h-10 px-3.5 text-sm`}>{tp("mode.listen")}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-line bg-surface px-5 py-4">
      <span className="text-sm leading-snug text-muted">{label}</span>
      <span className="font-mono text-[30px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}
