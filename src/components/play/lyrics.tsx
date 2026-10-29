"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { lyricLines, type Bar } from "@/lib/music/songs";

/**
 * The words of a public-domain song, the line being played and the one after:
 * the bar being played lights up in brass, so the chord change and the word
 * it falls on are read together. Nothing for a song without words.
 */
export function Lyrics({ bars, bar }: { bars: readonly Bar[]; bar: number }) {
  const t = useTranslations("play");
  const lines = useMemo(() => lyricLines(bars), [bars]);
  if (lines.length === 0) return null;
  const at = Math.max(bar, 0);
  let index = lines.findIndex((l) => l.last >= at);
  if (index < 0) index = lines.length - 1;
  const line = lines[index]!;
  const after = lines[index + 1];

  return (
    <section aria-label={t("lyrics")} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface px-7 py-5">
      <span className="eyebrow text-muted">{t("lyrics")}</span>
      <p className="m-0 text-[28px] font-bold leading-snug" aria-live="off">
        {line.parts.map((p) => (
          <span key={p.bar} className={p.bar === bar ? "text-brass-ink underline decoration-brass decoration-[3px] underline-offset-[6px]" : p.bar < bar ? "text-ink" : "text-ink-2"}>
            {p.text}
            {p.text && !p.runsOn ? " " : ""}
          </span>
        ))}
      </p>
      {after && <p className="m-0 text-lg text-muted">{after.parts.map((p) => p.text + (p.text && !p.runsOn ? " " : "")).join("")}</p>}
    </section>
  );
}
