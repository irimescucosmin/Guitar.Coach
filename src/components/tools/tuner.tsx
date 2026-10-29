"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { pitchFromSamples, readTuning, midiFromFrequency } from "@/lib/audio/detect";
import { engine } from "@/lib/audio/engine";
import { useProgress } from "@/components/providers";
import { IconCheck } from "@/components/ui/icons";
import { EMPTY_TUNE, IN_TUNE_CENTS, allInTune, tuneStep } from "@/lib/music/checks";

export function Tuner() {
  const t = useTranslations("tools.tuner");
  const tc = useTranslations("common");
  const [on, setOn] = useState(false);
  const [reading, setReading] = useState<{ string: number; cents: number; note: number } | null>(null);
  // Each string proven in tune this session; all six tick today's tuning.
  const [tune, setTune] = useState(EMPTY_TUNE);
  const { prove } = useProgress();
  const proved = useRef(false);

  useEffect(() => {
    if (!on) return;
    let id = 0;
    let last = 0;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      if (now - last < 80) return;
      last = now;
      const frame = engine.read();
      if (!frame || !engine.ctx) return;
      const hz = pitchFromSamples(frame.samples, engine.ctx.sampleRate);
      if (hz === null) return;
      const r = readTuning(hz);
      setReading({ ...r, note: ((Math.round(midiFromFrequency(hz)) % 12) + 12) % 12 });
      // Only readings close to a string count: a note two frets away is not that string tuned.
      if (Math.abs(r.cents) < 100) setTune((state) => tuneStep(state, r));
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [on]);

  const tuned = allInTune(tune);
  useEffect(() => {
    if (!tuned || proved.current) return;
    proved.current = true;
    engine.synth?.chime();
    prove("tuned");
  }, [tuned, prove]);

  const start = async () => setOn(await engine.startMic());
  const string = (n: number) => tc(`string.s${n as 0}`);
  const hint = reading
    ? Math.abs(reading.cents) <= IN_TUNE_CENTS
      ? t("inTune", { string: string(reading.string) })
      : reading.cents < 0
        ? t("low", { string: string(reading.string) })
        : t("high", { string: string(reading.string) })
    : t("help");
  const needle = reading ? 50 + Math.max(-50, Math.min(50, reading.cents)) : 50;

  return (
    <section id="tuner" className="flex scroll-mt-6 flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold">{t("title")}</h2>
        <button type="button" onClick={() => (on ? setOn(false) : void start())}
          className={`inline-flex h-12 items-center rounded-[var(--radius-control)] px-5 font-extrabold ${on ? "border border-line-strong" : "bg-primary text-on-primary"}`}>
          {on ? t("stop") : t("start")}
        </button>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{t("note")}</p>
          <p className="text-6xl font-black [font-stretch:85%]">{reading ? tc(`pitch.p${reading.note as 0}`) : "–"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted">{t("offset")}</p>
          <p className="font-mono text-3xl font-bold tabular-nums">{reading ? `${reading.cents > 0 ? "+" : ""}${reading.cents}` : "–"}</p>
        </div>
      </div>
      <div className="relative h-12 rounded-[var(--radius-field)] bg-[linear-gradient(90deg,var(--color-bad),var(--color-warn)_35%,var(--color-good)_47%,var(--color-good)_53%,var(--color-warn)_65%,var(--color-bad))]">
        <div className="absolute inset-y-[-6px] w-1 -translate-x-1/2 rounded bg-ink transition-[left] duration-75" style={{ left: `${needle}%` }} />
      </div>
      <p className="text-sm text-muted" aria-live="polite">{hint}</p>
      <ul aria-label={t("strings")} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {[0, 1, 2, 3, 4, 5].map((s) => (
          <li
            key={s}
            className={`flex items-center gap-1 rounded-[var(--radius-field)] border px-2 py-1 text-xs ${
              tune.done[s] ? "border-good bg-good-soft font-bold text-good-ink" : reading?.string === s ? "border-brass bg-brass font-bold text-on-brass" : "border-line text-muted"
            }`}
          >
            {tune.done[s] && <IconCheck size={12} />}
            {string(s)}
          </li>
        ))}
      </ul>
      <p className={`m-0 text-sm ${tuned ? "font-bold text-good" : "text-muted"}`}>{tuned ? t("allTuned") : t("proof")}</p>
    </section>
  );
}
