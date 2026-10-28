"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useProgress, useSettings } from "@/components/providers";
import { IconCheck } from "@/components/ui/icons";
import { learnHref } from "@/components/ui/links";
import { LESSONS } from "@/lib/music/path";

/** Every chord of the path, in the order the lessons teach them. */
export function ChordGrid() {
  const t = useTranslations("chords");
  const tc = useTranslations("common");
  const tp = useTranslations("path");
  const { progress } = useProgress();
  const { settings } = useSettings();
  const chords = LESSONS.flatMap((l, n) => l.newChords.map((c) => ({ chord: c, lesson: n })));
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 xl:grid-cols-4">
      {chords.map(({ chord: c, lesson }) => {
        const learned = progress.learned[c] === true;
        return (
          <li key={c}>
            <Link
              href={learnHref(c)}
              className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:border-ink"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-[44px] font-black leading-none [font-stretch:85%]" style={{ color: `var(--color-chord-${c})` }}>{c}</span>
                  <span className="text-sm font-semibold text-ink-2">{tc(`chord.${c}`)}</span>
                </span>
                {learned ? (
                  <span className="flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-1 text-xs font-bold text-good-ink">
                    <IconCheck size={12} />
                    {t("learned")}
                  </span>
                ) : (
                  <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-bold text-muted">{tp("lesson", { n: lesson })}</span>
                )}
              </span>
              <ChordDiagram chord={c} className="h-auto w-full max-w-[150px] self-center" leftHanded={settings.leftHanded}
                title={tc("diagram", { chord: c, name: tc(`chord.${c}`) })} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
