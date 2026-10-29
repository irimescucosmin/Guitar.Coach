"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMicState } from "@/components/chrome/mic-button";
import { IconCheck } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { midiFromFrequency, pitchFromSamples } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { openStringOf } from "@/lib/music/checks";

/** The same pitch this many frames in a row before it counts: a pluck settles, noise does not. */
const STABLE_FRAMES = 6;

/** Proof of "I know the open strings": play them, one at a time, in any order. */
export function StringsCheck({ onDone }: { onDone: (heard: boolean) => void }) {
  const t = useTranslations("start.strings");
  const tc = useTranslations("common");
  const mic = useMicState();
  const [heard, setHeard] = useState<boolean[]>([false, false, false, false, false, false]);
  const run = useRef({ last: -1, stable: 0 });
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (mic !== "on") return;
    let id = 0;
    const r = run.current;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame || !engine.ctx || frame.level < SILENCE) {
        r.stable = 0;
        return;
      }
      const hz = pitchFromSamples(frame.samples, engine.ctx.sampleRate);
      if (hz === null) return;
      const midi = Math.round(midiFromFrequency(hz));
      r.stable = midi === r.last ? r.stable + 1 : 1;
      r.last = midi;
      if (r.stable !== STABLE_FRAMES) return;
      const string = openStringOf(midi);
      if (string >= 0) setHeard((h) => (h[string] ? h : h.map((v, i) => v || i === string)));
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mic]);

  const all = heard.every(Boolean);
  useEffect(() => {
    if (!all) return;
    engine.synth?.chime();
    const id = window.setTimeout(() => onDoneRef.current(true), 900);
    return () => window.clearTimeout(id);
  }, [all]);

  const broken = mic === "denied" || mic === "unsupported" || mic === "insecure";
  return (
    <div className="flex flex-col gap-6">
      <ol aria-label={t("list")} className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-6">
        {heard.map((ok, s) => (
          <li key={s} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border-2 px-2 text-center ${ok ? "border-good bg-good-soft text-good-ink" : "border-line bg-surface"}`}>
            {ok ? <IconCheck /> : <span className="font-mono text-sm text-muted">{6 - s}ª</span>}
            <span className="text-sm font-bold">{tc(`string.s${s as 0}`)}</span>
          </li>
        ))}
      </ol>
      <p role="status" className="m-0 text-base font-bold">{all ? t("done") : mic === "on" ? t("play") : ""}</p>
      {mic !== "on" && !broken && (
        <button type="button" onClick={() => void engine.startMic()} className={`${button.brass} h-[52px] self-start text-[17px]`}>
          {tc(`mic.${mic}`)}
        </button>
      )}
      {broken && <p role="alert" className="m-0 rounded-[var(--radius-control)] bg-warn-soft px-4 py-3 text-[15px]">{mic === "insecure" ? tc("micInsecure") : tc("micDenied")}</p>}
      {!all && (
        <button type="button" onClick={() => onDone(false)} className={`${button.outline} h-12 self-start`}>
          {t("cannot")}
        </button>
      )}
      <p className="m-0 text-sm text-muted">{t("help")}</p>
    </div>
  );
}
