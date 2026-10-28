"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FRETS_SHOWN, NATURAL_PITCH_CLASSES, STRINGS_TOP_DOWN, isNatural, pitchClassAt, positionsOf } from "@/lib/music/fretboard";

const MARKERS: Record<number, string> = { 3: "•", 5: "•", 7: "•", 9: "•", 12: "••" };
const EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Every note from the open string to fret 12, thinnest string on top as in a tab. */
export function FretboardMap() {
  const t = useTranslations("fretboard");
  const tc = useTranslations("common");
  const [picked, setPicked] = useState(7);
  const [sharps, setSharps] = useState(true);
  const name = (pc: number) => tc(`pitch.p${pc as 0}`);
  const frets = Array.from({ length: FRETS_SHOWN + 1 }, (_, f) => f);

  return (
    <section aria-labelledby="map-title" className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-col gap-1">
          <h2 id="map-title" className="m-0 text-xl font-extrabold">{t("mapTitle")}</h2>
          <span className="text-sm text-muted">{t("mapHelp")}</span>
        </div>
        <label htmlFor="sharps" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
          <input id="sharps" type="checkbox" checked={sharps} onChange={(e) => setSharps(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
          {t("showSharps")}
        </label>
      </div>

      <div role="group" aria-label={t("pickNote")} className="flex flex-wrap gap-2">
        {NATURAL_PITCH_CLASSES.map((pc) => (
          <button
            key={pc}
            type="button"
            aria-pressed={pc === picked}
            onClick={() => setPicked(pc)}
            className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-bold ${
              pc === picked ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface text-ink"
            }`}
          >
            {name(pc)}
            <span className="font-mono text-xs opacity-75">{EN[pc]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-1">
          <caption className="sr-only">{t("mapTitle")}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-24" />
              {frets.map((f) => (
                <th key={f} scope="col" className="h-6 font-mono text-xs font-semibold text-muted">{f === 0 ? t("open") : f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STRINGS_TOP_DOWN.map((s) => (
              <tr key={s}>
                <th scope="row" className="text-left text-[13px] font-bold">
                  {tc(`string.s${s as 0}`)}
                </th>
                {frets.map((f) => {
                  const pc = pitchClassAt(s, f);
                  const hit = pc === picked;
                  const natural = isNatural(pc);
                  const visible = hit || natural || sharps;
                  return (
                    <td
                      key={f}
                      className={`h-11 rounded-[10px] text-center text-sm ${f === 0 ? "border-r-4 border-ink" : ""} ${
                        hit ? "bg-brass font-extrabold text-on-brass" : natural ? "bg-subtle font-bold" : "bg-page text-xs text-muted"
                      }`}
                    >
                      {visible ? name(pc) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr aria-hidden>
              <td />
              {frets.map((f) => (
                <td key={f} className="h-5 text-center text-sm tracking-widest text-line-strong">{MARKERS[f] ?? ""}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m-0 text-sm text-ink-2">{t("summary", { note: name(picked), en: EN[picked]!, count: positionsOf(picked).length })}</p>
    </section>
  );
}
