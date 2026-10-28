"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useProgress, useSettings } from "@/components/providers";
import { learnHref } from "@/components/ui/links";
import { LESSONS } from "@/lib/music/path";

export function ChordGrid() {
  const t = useTranslations("chords");
  const tc = useTranslations("common");
  const { progress } = useProgress();
  const { settings } = useSettings();
  const chords = LESSONS.flatMap((l) => l.newChords);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {chords.map((c) => (
        <li key={c}>
          <Link href={learnHref(c)} className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-line bg-surface p-3 hover:border-accent">
            <ChordDiagram chord={c} width={96} leftHanded={settings.leftHanded} title={tc("diagram", { chord: c, name: tc(`chord.${c}`) })} />
            <span className="font-mono text-xl font-bold" style={{ color: `var(--color-chord-${c})` }}>{c}</span>
            <span className="text-xs text-muted">{tc(`chord.${c}`)}</span>
            <span className={`text-xs font-semibold ${progress.learned[c] ? "text-good" : "text-transparent"}`}>
              {progress.learned[c] ? `✓ ${t("learned")}` : "·"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
