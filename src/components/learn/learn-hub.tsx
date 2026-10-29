"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProgress } from "@/components/providers";
import { IconBook, IconChords, IconEar, IconFretboard, IconPick } from "@/components/ui/icons";
import { lessonStates } from "@/lib/music/path";

const PAGES = [
  { key: "basics", href: "/basics", Icon: IconBook },
  { key: "chords", href: "/chords", Icon: IconChords },
  { key: "fretboard", href: "/fretboard", Icon: IconFretboard },
  { key: "ear", href: "/ear", Icon: IconEar },
  { key: "techniques", href: "/techniques", Icon: IconPick },
] as const;

const TERMS = ["chord", "box", "fret", "nut", "strum", "bar", "change", "letters", "semitone", "octave"] as const;

/**
 * Every page that teaches, in the order a beginner needs them, each saying
 * what it is and when it is for. And the words: the app uses a dozen terms a
 * beginner has never heard, so they are all here, in plain words, once.
 */
export function LearnHub() {
  const t = useTranslations("learn");
  const { progress } = useProgress();
  const noChords = !Object.values(progress.learned).some(Boolean);
  const notesLesson = lessonStates(progress).find((s) => s.lesson.id === "notes");
  // What to open now: the basics before the first chord, the chords after.
  const now = noChords ? "basics" : notesLesson && !notesLesson.complete && progress.learned.D ? "fretboard" : "chords";

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
        {PAGES.map(({ key, href, Icon }) => (
          <li key={key}>
            <Link href={href} className={`flex h-full gap-4 rounded-[var(--radius-card)] border bg-surface p-5 hover:border-ink ${key === now ? "border-[3px] border-brass" : "border-line"}`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-subtle text-ink"><Icon size={22} /></span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-lg font-extrabold">{t(`pages.${key}.title`)}</span>
                  {key === now && <span className="eyebrow text-brass-ink">{t("now")}</span>}
                </span>
                <span className="text-sm font-semibold text-muted">{t(`pages.${key}.when`)}</span>
                <span className="text-[15px] leading-relaxed text-ink-2">{t(`pages.${key}.body`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="words" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <div className="flex flex-col gap-1">
          <h2 id="words" className="m-0 text-xl font-extrabold">{t("wordsTitle")}</h2>
          <p className="m-0 text-[15px] text-ink-2">{t("wordsIntro")}</p>
        </div>
        <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {TERMS.map((k) => (
            <div key={k} id={`term-${k}`} className="flex scroll-mt-6 flex-col gap-0.5">
              <dt className="font-extrabold">{t(`words.${k}.term`)}</dt>
              <dd className="m-0 text-[15px] leading-relaxed text-ink-2">{t(`words.${k}.def`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
