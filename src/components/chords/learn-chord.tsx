"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useMicState } from "@/components/chrome/mic-button";
import { FeedbackBanner } from "@/components/play/player";
import type { Feedback } from "@/components/play/session";
import { useTransitionHint } from "@/components/play/transition-hint";
import { useProgress, useSettings } from "@/components/providers";
import { IconCheck, IconSpeaker } from "@/components/ui/icons";
import { button, learnHref, taskHref } from "@/components/ui/links";
import { matchChord } from "@/lib/audio/detect";
import { engine, SILENCE } from "@/lib/audio/engine";
import { CHORDS, stringsForPitchClasses, type ChordId } from "@/lib/music/chords";
import { fixFor, mutedStrings, openStrings, placementSteps } from "@/lib/music/feedback";
import { nextTask } from "@/lib/music/path";
import { frequentNext } from "@/lib/music/transitions";

const GOAL = 3;
const CLEAN_FRAMES = 3;

export function LearnChord({ chord }: { chord: ChordId }) {
  const t = useTranslations("chords");
  const tc = useTranslations("common");
  const hint = useTransitionHint();
  const locale = useLocale();
  const { progress, learn } = useProgress();
  const { settings } = useSettings();
  const mic = useMicState();
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [flagged, setFlagged] = useState<number[]>([]);
  const state = useRef({ armed: true, streak: 0, ignoreUntil: 0, lastFeedbackAt: 0, count: 0 });
  const learnRef = useRef(learn);
  useEffect(() => {
    learnRef.current = learn;
  }, [learn]);

  useEffect(() => {
    if (mic !== "on") return;
    let id = 0;
    const s = state.current;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      const frame = engine.read();
      if (!frame || s.count >= GOAL) return;
      if (frame.attack) s.armed = true;
      if (now < s.ignoreUntil || frame.level < SILENCE) {
        s.streak = 0;
        return;
      }
      const match = matchChord(frame.chroma, chord);
      if (match.clean) {
        if (s.armed && ++s.streak >= CLEAN_FRAMES) {
          s.armed = false;
          s.streak = 0;
          s.count += 1;
          setCount(s.count);
          setFlagged([]);
          setFeedback({ kind: "right", chord });
          engine.synth?.chime();
          if (s.count >= GOAL) learnRef.current(chord);
        }
        return;
      }
      s.streak = 0;
      if (now - s.lastFeedbackAt < 350) return;
      s.lastFeedbackAt = now;
      if (match.best !== chord && match.bestScore > 0.75) {
        setFeedback({ kind: "heard", chord, heard: match.best });
        setFlagged([]);
        return;
      }
      const fix = fixFor(chord, match.missing);
      if (!fix) return;
      setFlagged(stringsForPitchClasses(CHORDS[chord], match.missing));
      setFeedback(
        fix.kind === "pressFinger"
          ? { kind: "pressFinger", chord, note: CHORDS[chord].notes[fix.string]! % 12, finger: fix.finger, string: fix.string, fret: fix.fret }
          : { kind: "freeOpenString", chord, string: fix.string },
      );
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [mic, chord]);

  const listen = () => {
    const { ctx, synth } = engine.audio();
    synth.setVolume(settings.volume);
    synth.strum(chord, ctx.currentTime + 0.05, "down", "all");
    // Our own strum must not count as the player's.
    state.current.ignoreUntil = performance.now() + 2200;
  };

  const string = (n: number) => tc(`string.s${n as 0}`);
  const list = (items: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
  const done = count >= GOAL || progress.learned[chord] === true;
  const shown = done && count === 0 ? GOAL : count;
  const next = nextTask(progress);
  const wrongFinger = feedback?.kind === "pressFinger" ? feedback.finger : null;
  const open = openStrings(chord);
  const muted = mutedStrings(chord);

  return (
    <>
      <nav aria-label={t("breadcrumb")} className="flex items-center gap-2 text-sm text-muted">
        <Link href="/chords" className="font-semibold hover:text-ink">{t("title")}</Link>
        <span aria-hidden>/</span>
        <span className="font-bold text-ink">{chord}</span>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="flex flex-col items-center gap-5 rounded-[var(--radius-hero)] border border-line bg-surface px-8 py-7">
          <h1 className="m-0 flex items-baseline gap-3.5 self-start">
            <span className="text-[96px] font-black leading-[0.85] tracking-[-0.03em] [font-stretch:85%]" style={{ color: `var(--color-chord-${chord})` }}>{chord}</span>
            <span className="text-2xl font-semibold text-ink-2">{tc(`chord.${chord}`)}</span>
          </h1>
          <ChordDiagram chord={chord} className="h-auto w-full max-w-[300px]" leftHanded={settings.leftHanded} flagged={flagged}
            title={tc("diagram", { chord, name: tc(`chord.${chord}`) })} />
          <button type="button" onClick={listen} className={`${button.outline} h-12 self-stretch`}>
            <IconSpeaker />
            {t("listen")}
          </button>
        </section>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="place" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface px-7 py-6">
            <h2 id="place" className="display m-0 text-[26px] font-extrabold">{t("place")}</h2>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {placementSteps(chord).map((p) => {
                const wrong = p.finger === wrongFinger;
                return (
                  <li key={p.string} className={`flex min-h-14 items-center gap-3.5 rounded-[14px] px-4 text-base ${wrong ? "border-2 border-bad bg-bad-soft" : "bg-subtle"}`}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full font-extrabold text-white ${wrong ? "bg-bad" : "bg-navy"}`}>{p.finger}</span>
                    <span>
                      <strong className="capitalize">{tc(`finger.f${p.finger as 1}`)}</strong>
                      {" · "}
                      {t("placeOn", { string: string(p.string), fret: p.fret })}
                    </span>
                  </li>
                );
              })}
            </ol>
            {(open.length > 0 || muted.length > 0) && (
              <p className="m-0 text-[15px] text-ink-2">
                {open.length > 0 && t("open", { strings: list(open.map(string)) })}
                {open.length > 0 && muted.length > 0 && " "}
                {muted.length > 0 && t("muted", { strings: list(muted.map(string)) })}
              </p>
            )}
          </section>

          <section aria-labelledby="goal" className="flex flex-col gap-4 rounded-[var(--radius-card)] border-[3px] border-brass bg-surface px-7 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="goal" className="m-0 text-xl font-extrabold">{t("goalTitle")}</h2>
              <div className="flex gap-2" role="img" aria-label={t("count", { count: shown })}>
                {Array.from({ length: GOAL }, (_, i) => (
                  <span key={i} className={`flex size-11 items-center justify-center rounded-full text-lg font-extrabold ${
                    i < shown ? "bg-good text-white" : "border-2 border-line-strong text-muted"
                  }`}>
                    {i < shown ? <IconCheck /> : i + 1}
                  </span>
                ))}
              </div>
            </div>
            {feedback && <FeedbackBanner feedback={feedback} countIn={null} />}
            <span className="text-sm text-muted">{t("goal")}</span>
            {mic !== "on" && !done && (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void engine.startMic()} className={`${button.primary} h-12`}>
                  {tc("mic.off")}
                </button>
                <span className="text-sm text-muted">{t("micNeeded")}</span>
              </div>
            )}
            {done && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="m-0 flex items-center gap-2 font-bold text-good"><IconCheck />{t("done")}</p>
                {next && (
                  <Link href={taskHref(next)} className={`${button.brass} ml-auto h-12`}>
                    {t("nextStep")}
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section aria-labelledby="tips" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-7 py-6">
          <h2 id="tips" className="m-0 text-lg font-extrabold">{t("tipsTitle")}</h2>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-2">
            <li>{t("tips.pressure")}</li>
            <li>{t("tips.fingertips")}</li>
            <li>{t("tips.wrist")}</li>
          </ul>
        </section>
        <section aria-labelledby="from" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-7 py-6">
          <h2 id="from" className="m-0 text-lg font-extrabold">{t("goesTo", { chord })}</h2>
          <div className="flex flex-col gap-2.5">
            {frequentNext(chord).map((to) => (
              <Link key={to} href={learnHref(to)} className="flex items-center gap-4 rounded-[14px] bg-subtle px-4 py-3 hover:bg-sunken">
                <span className="w-12 text-[34px] font-black leading-none [font-stretch:85%]" style={{ color: `var(--color-chord-${to})` }}>{to}</span>
                <span className="text-[15px] text-ink-2">{hint(chord, to)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
