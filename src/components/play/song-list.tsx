"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProgress } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { playHref } from "@/components/ui/links";
import { SONGS, chordsOf, type SongGroup } from "@/lib/music/songs";

const GROUPS: SongGroup[] = ["exercise", "traditional", "progression"];

export function SongList() {
  const t = useTranslations("play");
  const { progress } = useProgress();
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t(`groups.${group}`)}</h2>
          <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {SONGS.filter((s) => s.group === group).map((song) => {
              const chords = chordsOf(song);
              const ready = chords.every((c) => progress.learned[c]);
              const best = progress.best[song.id];
              return (
                <li key={song.id}>
                  <Link
                    href={playHref(song.id, best?.step === undefined ? (ready ? "step" : "listen") : "timed")}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-sunken"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{song.title}</span>
                      <span className="text-xs text-muted">{t(`origin.${song.origin}`)}</span>
                    </span>
                    <span className="flex gap-1">
                      {chords.map((c) => (
                        <ChordChip key={c} chord={c} dim={!progress.learned[c]} />
                      ))}
                    </span>
                    <span className="w-12 text-right font-mono text-sm tabular-nums text-muted">
                      {best?.timed !== undefined ? `${Math.round(best.timed * 100)}%` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
