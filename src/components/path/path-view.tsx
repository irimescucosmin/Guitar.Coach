"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useProgress, useSettings } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { playHref, taskHref } from "@/components/ui/links";
import { PASS_SCORE, lessonStates, nextTask, type Task } from "@/lib/music/path";
import { chordsOf, findSong } from "@/lib/music/songs";

export function PathView() {
  const t = useTranslations("path");
  const tc = useTranslations("common");
  const { progress, signedIn } = useProgress();
  const { settings } = useSettings();
  const task = nextTask(progress);
  const states = lessonStates(progress);
  const score = Math.round(PASS_SCORE * 100);

  const songTitle = (id: string) => findSong(id)?.title ?? id;
  const taskTitle = (task: Task) =>
    task.kind === "learn"
      ? t("learn", { chord: task.chord })
      : task.kind === "step"
        ? t("step", { song: songTitle(task.song) })
        : t("timed", { song: songTitle(task.song) });
  const taskBody = (task: Task) =>
    task.kind === "learn" ? t("learnBody") : task.kind === "step" ? t("stepBody") : t("timedBody", { score });
  const taskLine = (task: Task) =>
    task.kind === "learn" ? t("taskLearn", { chord: task.chord }) : task.kind === "step" ? t("taskStep") : t("taskTimed", { score });

  return (
    <div className="flex flex-col gap-6">
      {!signedIn && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          {tc("guest")}
          <Link href="/account" className="font-semibold text-accent underline-offset-2 hover:underline">
            {tc("guestAction")}
          </Link>
        </p>
      )}

      <section aria-labelledby="next-step" className="rounded-[var(--radius-card)] border border-accent bg-surface p-5">
        <p id="next-step" className="text-xs font-semibold uppercase tracking-wider text-accent">
          {t("nextStep")}
        </p>
        {task ? (
          <div className="mt-3 flex flex-wrap items-center gap-5">
            {task.kind === "learn" ? (
              <ChordDiagram
                chord={task.chord}
                width={110}
                leftHanded={settings.leftHanded}
                title={tc("diagram", { chord: task.chord, name: tc(`chord.${task.chord}`) })}
              />
            ) : (
              <div className="flex gap-1.5">
                {chordsOf(findSong(task.song)!).map((c) => (
                  <ChordChip key={c} chord={c} />
                ))}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{taskTitle(task)}</h1>
              <p className="max-w-prose text-muted">{taskBody(task)}</p>
              <Link
                href={taskHref(task)}
                className="mt-1 self-start rounded-[var(--radius-field)] bg-accent px-4 py-2 font-semibold text-on-accent"
              >
                {t("start")}
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-3 max-w-prose text-lg">{t("allDone")}</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <ol className="flex flex-col gap-4">
          {states.map(({ lesson, tasks, done, total, complete }, i) => (
            <li key={lesson.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-bold">
                  {t("lesson", { n: i + 1 })} · {t(`lessonTitle.${lesson.id}`)}
                </h3>
                <span className={`text-sm ${complete ? "font-semibold text-good" : "text-muted"}`}>
                  {complete ? t("complete") : t("tasks", { done, total })}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <p className="max-w-prose text-sm text-muted">{t(`lessonTip.${lesson.id}`)}</p>
              <ul className="flex flex-col gap-1.5">
                {tasks.map(({ task, done }) => (
                  <li key={`${task.kind}-${"chord" in task ? task.chord : task.song}`}>
                    <Link href={taskHref(task)} className="flex items-center gap-2 text-sm hover:underline">
                      <span
                        aria-hidden
                        className={`flex size-5 items-center justify-center rounded-[var(--radius-field)] border text-xs ${
                          done ? "border-good bg-good text-on-accent" : "border-line"
                        }`}
                      >
                        {done ? "✓" : ""}
                      </span>
                      {taskLine(task)}
                    </Link>
                  </li>
                ))}
              </ul>
              {lesson.songs.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("songs")}</p>
                  <ul className="flex flex-col gap-1">
                    {lesson.songs.map((id) => {
                      const song = findSong(id)!;
                      const best = progress.best[id];
                      return (
                        <li key={id}>
                          <Link
                            href={playHref(id, best?.step === undefined ? "step" : "timed")}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-field)] px-2 py-1.5 hover:bg-sunken"
                          >
                            <span className="min-w-0 flex-1 font-medium">{song.title}</span>
                            <span className="flex gap-1">
                              {chordsOf(song).map((c) => (
                                <ChordChip key={c} chord={c} dim={!progress.learned[c]} />
                              ))}
                            </span>
                            {best?.timed !== undefined && (
                              <span className="font-mono text-sm tabular-nums text-muted">
                                {t("bestTimed", { percent: Math.round(best.timed * 100) })}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
