"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TransitionHint } from "@/components/play/transition-hint";
import { useProgress } from "@/components/providers";
import { IconCheck, IconPlay } from "@/components/ui/icons";
import { TODAY_HREF, button, changesHref, playHref, taskHref } from "@/components/ui/links";
import { engine } from "@/lib/audio/engine";
import { PASS_SCORE, type Task } from "@/lib/music/path";
import { dailyRoutine, localDate, type Block } from "@/lib/music/routine";
import { findSong } from "@/lib/music/songs";

/** Today's practice: the blocks in order, each ticked when done, here or anywhere in the app. */
export function TodayView() {
  const t = useTranslations("today");
  const locale = useLocale();
  const { progress, today, markDone } = useProgress();
  // The date is the browser's: read after mount, the server's clock may be on another day.
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(localDate(new Date())), []);

  if (!date) return null;
  const routine = dailyRoutine(progress, date);
  const done = today?.date === date ? today.done : [];
  const minutes = routine.reduce((sum, b) => sum + b.minutes, 0);
  const finished = routine.filter((b) => done.includes(b.id)).length;
  const label = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">{label}</span>
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
          <p className="m-0 text-base text-ink-2">{t("summary", { minutes, count: routine.length })}</p>
        </div>
        <div className="flex gap-3">
          <Stat value={`${finished}/${routine.length}`} label={t("done")} />
          <Stat value={String(today?.streak ?? 0)} label={t("streak", { count: today?.streak ?? 0 })} brass />
        </div>
      </header>

      {!progress.profile && <FirstRun />}

      <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-brass transition-[width]" style={{ width: `${(finished / routine.length) * 100}%` }} />
      </div>

      {finished === routine.length && (
        <section className="flex flex-col gap-1.5 rounded-[var(--radius-card)] bg-navy px-7 py-6 text-on-navy">
          <span className="eyebrow text-brass">{t("allDoneEyebrow")}</span>
          <p className="display m-0 text-[26px] font-extrabold">{t("allDone")}</p>
          <p className="m-0 text-base text-on-navy-muted">{t("allDoneBody")}</p>
        </section>
      )}

      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {routine.map((block, i) => (
          <BlockCard key={block.id} n={i + 1} block={block} done={done.includes(block.id)} onDone={() => markDone([block.id])} />
        ))}
      </ol>
      <p className="m-0 text-sm text-muted">{t("auto")}</p>
    </>
  );
}

/** No answers yet: the questions come before the plan, which is built on them. */
export function FirstRun() {
  const t = useTranslations("path.firstRun");
  return (
    <section aria-labelledby="first-run" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[var(--radius-card)] border-[3px] border-brass bg-surface px-6 py-5">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-1">
        <h2 id="first-run" className="m-0 text-xl font-extrabold">{t("title")}</h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t("body")}</p>
      </div>
      <Link href="/start" className={`${button.brass} h-12`}>{t("go")}</Link>
    </section>
  );
}

/** One line on the path page: how today is going, and the way to it. */
export function TodayStrip() {
  const t = useTranslations("today");
  const { progress, today } = useProgress();
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(localDate(new Date())), []);
  if (!date) return null;
  const routine = dailyRoutine(progress, date);
  const done = today?.date === date ? today.done : [];
  const finished = routine.filter((b) => done.includes(b.id)).length;
  return (
    <Link href={TODAY_HREF} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-control)] border border-line bg-surface px-5 py-3.5 hover:border-ink">
      <span className="font-extrabold">{t("strip", { done: finished, total: routine.length })}</span>
      {(today?.streak ?? 0) > 0 && <span className="text-sm font-bold text-brass-ink">{t("streak", { count: today!.streak })}: {today!.streak}</span>}
      <span className="ml-auto text-sm font-bold underline underline-offset-2">{t("open")}</span>
    </Link>
  );
}

function Stat({ value, label, brass = false }: { value: string; label: string; brass?: boolean }) {
  return (
    <div className={`flex min-w-[120px] flex-col gap-0.5 rounded-[var(--radius-control)] border px-4 py-3 ${brass ? "border-brass bg-surface" : "border-line bg-surface"}`}>
      <span className="font-mono text-[28px] font-semibold leading-none">{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}

function BlockCard({ n, block, done, onDone }: { n: number; block: Block; done: boolean; onDone: () => void }) {
  const t = useTranslations("today");
  const tp = useTranslations("path");
  const tpl = useTranslations("play");
  const score = Math.round(PASS_SCORE * 100);
  const songTitle = (id: string) => findSong(id)?.title ?? id;
  const taskTitle = (task: Task) => {
    switch (task.kind) {
      case "notes": return tp("notesTitle");
      case "learn": return tp("learn", { chord: task.chord });
      case "step": return tp("step", { song: songTitle(task.song) });
      case "timed": return tp("timed", { song: songTitle(task.song) });
    }
  };
  const taskBody = (task: Task) => {
    switch (task.kind) {
      case "notes": return tp("notesBody");
      case "learn": return tp("learnBody");
      case "step": return tp("stepBody");
      case "timed": return tp("timedBody", { score });
    }
  };

  let title = "";
  let body: ReactNode = null;
  let action: { href: string; label: string } | null = null;
  let timer = false;
  switch (block.id) {
    case "tune":
      title = t("tune.title");
      body = t("tune.body");
      action = { href: "/tools#tuner", label: t("tune.go") };
      break;
    case "warmup":
      title = t("warmup.title");
      body = (
        <>
          <span>{t("warmup.body")}</span>
          <span className="text-muted">{t("warmup.tip")}</span>
        </>
      );
      timer = true;
      break;
    case "new":
      title = taskTitle(block.task);
      body = taskBody(block.task);
      action = { href: taskHref(block.task), label: t("new.go") };
      break;
    case "changes": {
      const [a, b] = block.pair;
      title = t("changes.title", { a, b });
      body = (
        <>
          <span>{block.best === null ? t("changes.first") : t("changes.beat", { best: block.best })}</span>
          <TransitionHint from={a} to={b} className="text-muted" />
        </>
      );
      action = { href: changesHref(a, b), label: t("changes.go") };
      break;
    }
    case "song":
      title = songTitle(block.song);
      body = t("song.body", { mode: tpl(`mode.${block.mode}`) });
      action = { href: playHref(block.song, block.mode), label: t("song.go") };
      break;
  }

  return (
    <li className={`flex flex-wrap items-start gap-x-5 gap-y-4 rounded-[var(--radius-card)] border bg-surface p-6 ${done ? "border-line opacity-75" : "border-line"}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-lg font-semibold ${done ? "bg-good text-white" : "bg-navy text-on-navy"}`}>
        {done ? <IconCheck /> : n}
      </span>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className={`m-0 text-xl font-extrabold ${done ? "text-muted line-through decoration-2" : ""}`}>{title}</h2>
          <span className="eyebrow text-brass-ink">{t(`kind.${block.id}`)} · {t("minutes", { count: block.minutes })}</span>
        </div>
        <p className="m-0 flex flex-col gap-1 text-[15px] leading-relaxed text-ink-2">{body}</p>
        {timer && !done && <Countdown minutes={block.minutes} onEnd={onDone} />}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {action && !done && (
          <Link href={action.href} className={`${button.brass} h-12`}>
            <IconPlay />
            {action.label}
          </Link>
        )}
        {!done && (
          <button type="button" onClick={onDone} className={`${button.outline} h-12`}>
            {t("markDone")}
          </button>
        )}
        {done && <span className="flex items-center gap-2 text-sm font-bold text-good"><IconCheck size={16} />{t("isDone")}</span>}
      </div>
    </li>
  );
}

/** A plain countdown for the blocks the microphone cannot judge; a chime at the end. */
function Countdown({ minutes, onEnd }: { minutes: number; onEnd: () => void }) {
  const t = useTranslations("today");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) {
        window.clearInterval(id);
        setEndsAt(null);
        engine.synth?.chime();
        onEndRef.current();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (endsAt === null) {
    return (
      <button
        type="button"
        onClick={() => {
          engine.audio(); // so the chime can sound at the end
          const start = Date.now();
          setNow(start);
          setEndsAt(start + minutes * 60_000);
        }}
        className="mt-1 self-start text-sm font-bold text-brass-ink underline underline-offset-2"
      >
        {t("timer.start", { count: minutes })}
      </button>
    );
  }
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <span role="timer" className="mt-1 flex items-center gap-3 font-mono text-2xl font-semibold tabular-nums">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      <button type="button" onClick={() => setEndsAt(null)} className="font-sans text-sm font-bold text-muted underline underline-offset-2">
        {t("timer.stop")}
      </button>
    </span>
  );
}

