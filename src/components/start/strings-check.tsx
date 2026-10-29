"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMicState } from "@/components/chrome/mic-button";
import { IconCheck } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { midiFromFrequency, pitchFromSamples } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { isAskedString, openStringOf, stringOrder } from "@/lib/music/checks";

/** The same pitch this many frames in a row before it counts: a pluck settles, noise does not. */
const STABLE_FRAMES = 6;

/**
 * Proof of "I know the open strings": the app names one string at a time, in
 * an order nobody can guess, and only that string counts. Plucking all six
 * without knowing which is which does not pass.
 */
export function StringsCheck({ onDone }: { onDone: (heard: boolean) => void }) {
  const t = useTranslations("start.strings");
  const tc = useTranslations("common");
  const mic = useMicState();
  const [order] = useState(() => stringOrder(Date.now() & 0x7fffffff));
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const run = useRef({ last: -1, stable: 0, ignoreUntil: 0 });
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  const asked = order[index];

  useEffect(() => {
    if (mic !== "on" || asked === undefined) return;
    let id = 0;
    const r = run.current;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame || !engine.ctx || now < r.ignoreUntil || frame.level < SILENCE) {
        r.stable = 0;
        return;
      }
      const hz = pitchFromSamples(frame.samples, engine.ctx.sampleRate);
      if (hz === null) return;
      const midi = Math.round(midiFromFrequency(hz));
      r.stable = midi === r.last ? r.stable + 1 : 1;
      r.last = midi;
      if (r.stable !== STABLE_FRAMES) return;
      if (isAskedString(midi, asked)) {
        engine.synth?.chime();
        setWrong(null);
        // The previous string may still ring: give the next one a clean start.
        r.ignoreUntil = now + 700;
        setIndex((i) => i + 1);
      } else if (openStringOf(midi) >= 0) setWrong(openStringOf(midi));
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mic, asked]);

  const all = index >= order.length;
  useEffect(() => {
    if (!all) return;
    const id = window.setTimeout(() => onDoneRef.current(true), 700);
    return () => window.clearTimeout(id);
  }, [all]);

  const broken = mic === "denied" || mic === "unsupported" || mic === "insecure";
  const name = (s: number) => t(`names.s${s as 0}`);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <span className="eyebrow text-muted">{t("progress", { n: Math.min(index + 1, order.length), total: order.length })}</span>
        <p className="display m-0 text-[34px] font-extrabold">{all ? t("done") : t("ask", { string: name(asked!) })}</p>
        <div aria-hidden className="flex gap-2">
          {order.map((_, i) => (
            <span key={i} className={`flex size-8 items-center justify-center rounded-full ${i < index ? "bg-good text-white" : i === index ? "border-2 border-brass" : "border-2 border-line"}`}>
              {i < index && <IconCheck size={14} />}
            </span>
          ))}
        </div>
        <p role="status" className="m-0 min-h-6 text-[15px] font-semibold text-bad-ink">{wrong !== null && !all ? t("wrong", { string: name(wrong) }) : ""}</p>
      </div>
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
