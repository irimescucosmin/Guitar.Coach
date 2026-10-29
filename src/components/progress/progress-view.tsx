"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { loadWeeklySummary } from "@/app/actions";
import { useLocale, useTranslations } from "next-intl";
import { LineChart } from "@/components/charts/line-chart";
import { useProgress } from "@/components/providers";
import { button, changesHref, playHref } from "@/components/ui/links";
import { CHORD_IDS } from "@/lib/music/chords";
import { EAR_LEVELS, UNLOCK_SCORE, earId } from "@/lib/music/ear";
import { calendar, changeSeries, practised, reviewList, stepSeries, timedSeries, weekSummary, type History } from "@/lib/music/history";
import { PASS_SCORE } from "@/lib/music/path";
import { localDate } from "@/lib/music/routine";
import { findSong } from "@/lib/music/songs";
import { Recordings, type RecordingItem } from "./recordings";

/** How things are going: the week in numbers, what to review, every result over time. */
export function ProgressView({ history, coach, recordings }: { history: History; coach: boolean; recordings: RecordingItem[] }) {
  const t = useTranslations("stats");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { progress, today } = useProgress();
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(localDate(new Date())), []);
  // The week in words, written once per week by the assistant; nothing without a key.
  const [summary, setSummary] = useState<string | null>(null);
  useEffect(() => {
    if (!coach) return;
    void loadWeeklySummary(localDate(new Date())).then(setSummary);
  }, [coach]);
  const lists = practised(history);
  const [pair, setPair] = useState(lists.pairs[0] ?? "");
  const [stepSong, setStepSong] = useState(lists.stepSongs[0] ?? "");
  const [timedSong, setTimedSong] = useState(lists.timedSongs[0] ?? "");

  if (!date) return null;
  const week = weekSummary(history, date);
  const review = reviewList(progress);
  const songTitle = (id: string) => (id === "notes" ? t("notesDrill") : findSong(id)?.title ?? id);
  const formatDay = (day: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00`));
  const percent = (v: number) => `${Math.round(v * 100)}%`;
  const seconds = (v: number) => `${(v / 1000).toFixed(1)} s`;
  const learned = CHORD_IDS.filter((c) => progress.learned[c]).length;
  const bestChanges = Math.max(0, ...Object.values(progress.changes ?? {}).map((v) => v ?? 0));

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">{t("eyebrow")}</span>
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>

      <section aria-label={t("numbers")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile value={String(today?.streak ?? 0)} label={t("streak")} />
        <Tile value={`${week.days}/7`} label={t("week", { previous: week.previousDays })} />
        <Tile value={`${learned}/${CHORD_IDS.length}`} label={t("chords")} />
        <Tile value={bestChanges > 0 ? String(bestChanges) : "–"} label={t("changesBest")} />
      </section>

      {summary && (
        <section aria-labelledby="week-words" className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-navy px-7 py-6 text-on-navy">
          <span id="week-words" className="eyebrow text-brass">{t("summary.title")}</span>
          <p className="m-0 text-lg leading-relaxed">{summary}</p>
          <Link href="/coach" className="self-start text-sm font-bold text-brass underline underline-offset-2">{t("summary.ask")}</Link>
        </section>
      )}

      <section aria-labelledby="review" className="flex flex-col gap-3 rounded-[var(--radius-card)] border-[3px] border-brass bg-surface p-6">
        <h2 id="review" className="m-0 text-xl font-extrabold">{t("review.title")}</h2>
        {review.length === 0 ? (
          <p className="m-0 text-[15px] text-ink-2">{t("review.none")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {review.map((item) => {
              const [text, href] =
                item.kind === "pair"
                  ? [item.best === null ? t("review.pairNew", { a: item.pair[0], b: item.pair[1] }) : t("review.pair", { a: item.pair[0], b: item.pair[1], best: item.best }), changesHref(...item.pair)]
                  : item.kind === "song"
                    ? [t("review.song", { song: songTitle(item.song), best: percent(item.best), need: percent(PASS_SCORE) }), playHref(item.song, "timed")]
                    : [t("review.ear", { level: item.level, best: percent(item.best), need: percent(UNLOCK_SCORE) }), `/ear?level=${item.level}`];
              return (
                <li key={href} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-subtle px-4 py-3">
                  <span className="text-[15px]">{text}</span>
                  <Link href={href} className={`${button.outline} h-10 text-sm`}>{t("review.go")}</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="calendar" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <h2 id="calendar" className="m-0 text-xl font-extrabold">{t("calendar.title")}</h2>
        <p className="m-0 text-sm text-muted">{t("calendar.help")}</p>
        <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label={t("calendar.label", { days: history.days.length })}>
          {calendar(history, date).map((week, w) => (
            <div key={w} className="flex flex-col gap-1">
              {week.map((d) => (
                <span
                  key={d.day}
                  title={`${formatDay(d.day)}: ${t("calendar.blocks", { count: d.blocks })}`}
                  className="size-5 rounded-[4px]"
                  style={{ background: d.blocks === 0 ? "var(--color-sunken)" : `color-mix(in oklab, var(--color-brass) ${d.blocks >= 5 ? 100 : d.blocks >= 3 ? 70 : 40}%, var(--color-surface))` }}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="m-0 flex items-center gap-2 text-xs text-muted">
          {t("calendar.less")}
          {[0, 40, 70, 100].map((v) => (
            <span key={v} className="size-3.5 rounded-[3px]" style={{ background: v === 0 ? "var(--color-sunken)" : `color-mix(in oklab, var(--color-brass) ${v}%, var(--color-surface))` }} />
          ))}
          {t("calendar.more")}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t("charts.changes.title")} help={t("charts.changes.help")}
          picker={lists.pairs.length > 1 && <Picker label={t("pick.pair")} value={pair} onChange={setPair} options={lists.pairs.map((p) => [p, p.replace("-", " ↔ ")])} />}>
          <LineChart points={pair ? changeSeries(history, pair) : []} format={(v) => String(Math.round(v))} label={t("charts.changes.label", { pair: pair.replace("-", " ↔ ") })}
            formatDay={formatDay} empty={t("charts.empty.changes")} min={0} />
        </ChartCard>
        <ChartCard title={t("charts.step.title")} help={t("charts.step.help")}
          picker={lists.stepSongs.length > 1 && <Picker label={t("pick.song")} value={stepSong} onChange={setStepSong} options={lists.stepSongs.map((s) => [s, songTitle(s)])} />}>
          <LineChart points={stepSong ? stepSeries(history, stepSong) : []} format={seconds} label={t("charts.step.label", { song: songTitle(stepSong) })}
            formatDay={formatDay} empty={t("charts.empty.step")} min={0} />
        </ChartCard>
        <ChartCard title={t("charts.timed.title")} help={t("charts.timed.help")}
          picker={lists.timedSongs.length > 1 && <Picker label={t("pick.song")} value={timedSong} onChange={setTimedSong} options={lists.timedSongs.map((s) => [s, songTitle(s)])} />}>
          <LineChart points={timedSong ? timedSeries(history, timedSong) : []} format={percent} label={t("charts.timed.label", { song: songTitle(timedSong) })}
            reference={{ value: PASS_SCORE, label: t("charts.timed.pass") }} formatDay={formatDay} empty={t("charts.empty.timed")} min={0} max={1} />
        </ChartCard>
        <ChartCard title={t("charts.ear.title")} help={t("charts.ear.help")}>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {EAR_LEVELS.map((level) => {
              const best = progress.best[earId(level)]?.timed;
              return (
                <li key={level} className="grid grid-cols-[88px_1fr_48px] items-center gap-3 text-sm">
                  <span className="font-semibold">{t("charts.ear.level", { level })}</span>
                  <span className="relative h-3 rounded-full bg-sunken">
                    {best !== undefined && <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${Math.max(best * 100, 2)}%` }} />}
                    <span aria-hidden className="absolute -inset-y-1 w-0.5 bg-brass" style={{ left: `${UNLOCK_SCORE * 100}%` }} />
                  </span>
                  <span className="text-right font-mono">{best === undefined ? "–" : percent(best)}</span>
                </li>
              );
            })}
          </ul>
          <p className="m-0 text-xs text-muted">{t("charts.ear.mark")}</p>
        </ChartCard>
      </div>
      <Recordings recordings={recordings} />
      <p className="m-0 text-sm text-muted">{tc("appName")} · {t("note")}</p>
    </>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
      <span className="font-mono text-[30px] font-semibold leading-none">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

function ChartCard({ title, help, picker, children }: { title: string; help: string; picker?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-lg font-extrabold">{title}</h2>
          <p className="m-0 text-sm text-muted">{help}</p>
        </div>
        {picker}
      </div>
      {children}
    </section>
  );
}

function Picker({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-[var(--radius-field)] border border-line-strong bg-surface px-2">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
