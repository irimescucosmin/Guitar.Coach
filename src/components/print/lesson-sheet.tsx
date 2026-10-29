import { getTranslations } from "next-intl/server";
import { ChordDiagram } from "@/components/chord-diagram";
import { transitionWords } from "@/components/play/transition-words";
import { LESSONS, PASS_SCORE, currentLessonIndex, type Progress } from "@/lib/music/path";
import { placementSteps, openStrings, mutedStrings } from "@/lib/music/feedback";
import { patternSymbols } from "@/lib/music/patterns";
import { chordsOf, findSong } from "@/lib/music/songs";

/**
 * The sheet for the music stand: the current lesson's chords with fingers,
 * how to change between them, the rhythm and the songs it unlocks. Built from
 * the player's own progress, so it is the lesson they are actually on.
 */
export async function LessonSheet({ progress, locale, name }: { progress: Progress; locale: string; name: string }) {
  const t = await getTranslations("print");
  const tp = await getTranslations("path");
  const tc = await getTranslations("common");
  const tpl = await getTranslations("play");
  const words = await transitionWords(locale);
  const index = Math.min(currentLessonIndex(progress), LESSONS.length - 1);
  const lesson = LESSONS[index]!;
  // Lesson 0 has no chords: the sheet shows the open strings instead.
  const chords = lesson.newChords;
  const pairs = chords.flatMap((a, i) => chords.slice(i + 1).map((b) => [a, b] as const));
  const songs = lesson.songs.map(findSong).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const string = (n: number) => tc(`string.s${n as 0}`);
  const list = (xs: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(xs);

  return (
    <article className="flex flex-col gap-6 text-ink">
      <header className="flex flex-col gap-1 border-b-2 border-ink pb-4">
        <span className="eyebrow text-muted">{t("lesson.eyebrow", { name })}</span>
        <h1 className="display m-0 text-[32px] font-extrabold">{tp("lesson", { n: index })} · {tp(`lessonTitle.${lesson.id}`)}</h1>
        <p className="m-0 text-[15px] text-ink-2">{tp(`lessonTip.${lesson.id}`)}</p>
      </header>

      {lesson.id === "notes" && (
        <section className="flex flex-col gap-3 break-inside-avoid">
          <h2 className="m-0 text-lg font-extrabold">{t("lesson.openStrings")}</h2>
          <ol className="m-0 grid list-none grid-cols-6 gap-2 p-0 text-center">
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <li key={s} className="flex flex-col rounded-[var(--radius-field)] border border-line py-3">
                <span className="text-2xl font-extrabold">{tc(`pitch.p${[4, 9, 2, 7, 11, 4][s] as 0}`)}</span>
                <span className="text-xs text-muted">{6 - s}ª</span>
              </li>
            ))}
          </ol>
          <p className="m-0 text-sm text-ink-2">{t("lesson.openStringsHelp")}</p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-6 break-inside-avoid">
        {chords.map((c) => (
          <div key={c} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line p-4">
            <h2 className="m-0 flex items-baseline gap-2 text-2xl font-extrabold">
              <span className="text-[40px] leading-none [font-stretch:85%]" style={{ color: `var(--color-chord-${c})` }}>{c}</span>
              <span className="text-base font-semibold text-ink-2">{tc(`chord.${c}`)}</span>
            </h2>
            <ChordDiagram chord={c} className="h-auto w-[150px]" leftHanded={false} title={tc("diagram", { chord: c, name: tc(`chord.${c}`) })} />
            <ol className="m-0 flex list-decimal flex-col gap-0.5 pl-5 text-sm">
              {placementSteps(c).map((p) => (
                <li key={p.string}>{t("lesson.finger", { finger: p.finger, name: tc(`finger.f${p.finger as 1}`), string: string(p.string), fret: p.fret })}</li>
              ))}
            </ol>
            {openStrings(c).length > 0 && <p className="m-0 text-xs text-ink-2">{t("lesson.open", { strings: list(openStrings(c).map(string)) })}</p>}
            {mutedStrings(c).length > 0 && <p className="m-0 text-xs text-ink-2">{t("lesson.muted", { strings: list(mutedStrings(c).map(string)) })}</p>}
          </div>
        ))}
      </section>

      {pairs.length > 0 && (
        <section className="flex flex-col gap-2 break-inside-avoid">
          <h2 className="m-0 text-lg font-extrabold">{t("lesson.changes")}</h2>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {pairs.map(([a, b]) => (
              <li key={`${a}${b}`} className="flex gap-3">
                <span className="w-20 shrink-0 font-extrabold">{a} ↔ {b}</span>
                <span>{words(a, b)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2 break-inside-avoid">
        <h2 className="m-0 text-lg font-extrabold">{t("lesson.tasks")}</h2>
        <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm">
          {lesson.id === "notes" ? (
            <li>{tp("taskNotes")}</li>
          ) : (
            <>
              {chords.map((c) => <li key={c}>{tp("taskLearn", { chord: c })}</li>)}
              <li>{tp("taskStep")}</li>
              <li>{tp("taskTimed", { score: Math.round(PASS_SCORE * 100) })}</li>
            </>
          )}
        </ol>
      </section>

      {songs.length > 0 && (
        <section className="flex flex-col gap-2 break-inside-avoid">
          <h2 className="m-0 text-lg font-extrabold">{t("lesson.songs")}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-1 pr-3 font-bold">{t("lesson.song")}</th>
                <th className="py-1 pr-3 font-bold">{t("lesson.chords")}</th>
                <th className="py-1 font-bold">{t("lesson.rhythm")}</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-semibold">{s.title}</td>
                  <td className="py-1.5 pr-3">{chordsOf(s).join(" ")}</td>
                  <td className="py-1.5 font-mono">{patternSymbols(s.pattern, s.beatsPerBar).join(" ")} · {tpl(`patternHelp.${s.pattern}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="m-0 text-xs text-muted">{t("footer")}</p>
    </article>
  );
}
