import { getTranslations } from "next-intl/server";
import { dailyRoutine, dayNumber, type Block } from "@/lib/music/routine";
import type { Progress } from "@/lib/music/path";
import { findSong } from "@/lib/music/songs";

/**
 * Seven days of routine on one sheet, each day as the app would plan it from
 * today's progress: tomorrow's plan may differ once today is done, which is
 * fine for a paper the player keeps on the stand.
 */
export async function WeekSheet({ progress, locale, start, name }: { progress: Progress; locale: string; start: string; name: string }) {
  const t = await getTranslations("print");
  const tt = await getTranslations("today");
  const tp = await getTranslations("path");
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const days = Array.from({ length: 7 }, (_, i) => new Date((dayNumber(start) + i) * 86_400_000).toISOString().slice(0, 10));
  const songTitle = (id: string) => findSong(id)?.title ?? id;
  const line = (b: Block): string => {
    switch (b.id) {
      case "tune": return tt("tune.title");
      case "warmup": return tt("warmup.title");
      case "ear": return tt("ear.title", { level: b.level });
      case "new": {
        const task = b.task;
        return task.kind === "notes" ? tp("notesTitle") : task.kind === "learn" ? tp("learn", { chord: task.chord }) : task.kind === "step" ? tp("step", { song: songTitle(task.song) }) : tp("timed", { song: songTitle(task.song) });
      }
      case "changes": return tt("changes.title", { a: b.pair[0], b: b.pair[1] });
      case "song": return songTitle(b.song);
    }
  };

  return (
    <article className="flex flex-col gap-5 text-ink">
      <header className="flex flex-col gap-1 border-b-2 border-ink pb-4">
        <span className="eyebrow text-muted">{t("week.eyebrow", { name })}</span>
        <h1 className="display m-0 text-[32px] font-extrabold">{t("week.title")}</h1>
        <p className="m-0 text-[15px] text-ink-2">{t("week.intro", { minutes: progress.profile?.minutes ?? 20 })}</p>
      </header>
      {days.map((day) => {
        const routine = dailyRoutine(progress, day);
        return (
          <section key={day} className="flex flex-col gap-2 break-inside-avoid border-t border-line pt-3">
            <h2 className="m-0 text-base font-extrabold capitalize">{fmt.format(new Date(`${day}T12:00:00`))}</h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1 p-0 text-sm sm:grid-cols-2">
              {routine.map((b) => (
                <li key={b.id} className="flex items-center gap-2">
                  <span aria-hidden className="inline-block size-4 shrink-0 rounded-[3px] border border-ink" />
                  <span>{line(b)}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{b.minutes}′</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="m-0 text-xs text-muted">{t("week.note")}</p>
    </article>
  );
}
