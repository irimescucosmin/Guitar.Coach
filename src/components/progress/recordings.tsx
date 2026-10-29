"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { playHref } from "@/components/ui/links";
import { byWeek, songToKeepRecording, type RecordingInfo } from "@/lib/music/recordings";

export type RecordingItem = RecordingInfo & { title: string };

/**
 * The week's recordings, newest week first, each playable in place. The
 * same song week after week is what makes them comparable, so the song
 * recorded most is the one the page suggests recording again.
 */
export function Recordings({ recordings }: { recordings: RecordingItem[] }) {
  const t = useTranslations("stats.recordings");
  const locale = useLocale();
  const weeks = byWeek(recordings);
  const keep = songToKeepRecording(recordings);
  const keepTitle = recordings.find((r) => r.song === keep)?.title;
  const formatDay = (day: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`));
  const minutes = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, "0")}`;

  return (
    <section id="recordings" aria-labelledby="recordings-title" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 id="recordings-title" className="m-0 text-xl font-extrabold">{t("title")}</h2>
        <p className="m-0 text-sm text-ink-2">{t("intro")}</p>
      </div>
      {weeks.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t("empty")}</p>
      ) : (
        <>
          {keep && keepTitle && (
            <p className="m-0 text-sm">
              {t("keep", { song: keepTitle })} <Link href={playHref(keep, "timed")} className="font-bold underline underline-offset-2">{t("recordAgain")}</Link>
            </p>
          )}
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {weeks.map(({ week, recordings: list }) => (
              <li key={week} className="flex flex-col gap-2">
                <h3 className="m-0 text-sm font-bold text-muted">{t("week", { from: formatDay(week) })}</h3>
                {list.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-control)] bg-sunken px-4 py-3">
                    <span className="flex min-w-[200px] flex-col">
                      <span className="font-extrabold">{r.title}</span>
                      <span className="text-[13px] text-muted">
                        {formatDay(r.day)} · {minutes(r.durationMs)}
                        {r.share !== null && ` · ${t("share", { percent: Math.round(r.share * 100) })}`}
                      </span>
                    </span>
                    <audio controls preload="none" src={`/api/recordings/${r.id}`} aria-label={t("player", { song: r.title, day: formatDay(r.day) })} className="h-10 max-w-full flex-1" />
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
