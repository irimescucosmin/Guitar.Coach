"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useProgress, useSettings } from "@/components/providers";
import { IconAlert, IconCheck, IconSpeaker } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { engine } from "@/lib/audio/engine";
import { isChordId } from "@/lib/music/chords";
import {
  EAR_LEVELS,
  ROUND_LENGTH,
  UNLOCK_SCORE,
  earChords,
  earId,
  earRound,
  unlockedLevel,
  type EarLevel,
  type EarQuestion,
} from "@/lib/music/ear";

type Round = { level: EarLevel; questions: EarQuestion[]; index: number; right: number; picked: string | null };

/** Five levels, each a round of ten questions the synth plays; eight right open the next. */
export function EarView({ startLevel }: { startLevel?: EarLevel }) {
  const t = useTranslations("ear");
  const { progress, record } = useProgress();
  const open = unlockedLevel(progress);
  const [round, setRound] = useState<Round | null>(null);
  const [result, setResult] = useState<{ level: EarLevel; share: number; isRecord: boolean; unlocked: boolean } | null>(null);

  const start = (level: EarLevel) => {
    engine.audio(); // the click is the gesture the browser wants before any sound
    setResult(null);
    setRound({ level, questions: earRound(level, earChords(progress), Date.now() & 0x7fffffff), index: 0, right: 0, picked: null });
  };

  // Arriving from today's routine with a level: open the level list scrolled to it.
  useEffect(() => {
    if (startLevel) document.getElementById(`level-${startLevel}`)?.scrollIntoView({ block: "center" });
  }, [startLevel]);

  const finish = (r: Round) => {
    const share = r.right / ROUND_LENGTH;
    const wasOpen = unlockedLevel(progress);
    const isRecord = record({ songId: earId(r.level), mode: "timed", value: share });
    setResult({ level: r.level, share, isRecord, unlocked: share >= UNLOCK_SCORE && r.level === wasOpen && r.level < 5 });
    setRound(null);
  };

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">{t("eyebrow")}</span>
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>

      {round ? (
        <Question round={round} setRound={setRound} onFinish={finish} onQuit={() => setRound(null)} />
      ) : (
        <>
          {result && (
            <section aria-live="polite" className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[var(--radius-card)] bg-navy px-7 py-6 text-on-navy">
              <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="eyebrow text-brass">{t("result.eyebrow", { level: result.level })}</span>
                  {result.isRecord && result.share > 0 && <span className="rounded-[6px] bg-good px-2 py-0.5 text-sm font-bold text-white">{t("result.record")}</span>}
                </div>
                <p className="display m-0 text-[26px] font-extrabold">{t("result.score", { right: Math.round(result.share * ROUND_LENGTH), total: ROUND_LENGTH })}</p>
                <p className="m-0 text-base text-on-navy-muted">
                  {result.unlocked ? t("result.unlocked", { level: result.level + 1 }) : result.share >= UNLOCK_SCORE ? t("result.passed") : t("result.again", { need: Math.round(UNLOCK_SCORE * ROUND_LENGTH) })}
                </p>
              </div>
              <button type="button" onClick={() => start(result.unlocked ? ((result.level + 1) as EarLevel) : result.level)} className={`${button.brass} h-[52px] text-[17px]`}>
                {result.unlocked ? t("result.next", { level: result.level + 1 }) : t("result.retry")}
              </button>
            </section>
          )}

          <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {EAR_LEVELS.map((level) => {
              const best = progress.best[earId(level)]?.timed;
              const locked = level > open;
              const passed = (best ?? 0) >= UNLOCK_SCORE;
              return (
                <li key={level} id={`level-${level}`} className={`flex flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-6 ${level === startLevel ? "border-[3px] border-brass" : "border-line"} ${locked ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-brass-ink">{t("level", { level })}</span>
                    {passed ? (
                      <span className="flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-1 text-xs font-bold text-good-ink"><IconCheck size={12} />{t("passed")}</span>
                    ) : best !== undefined ? (
                      <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-bold text-muted">{t("best", { percent: Math.round(best * 100) })}</span>
                    ) : null}
                  </div>
                  <h2 className="m-0 text-xl font-extrabold">{t(`levels.l${level}.title`)}</h2>
                  <p className="m-0 flex-1 text-[15px] leading-relaxed text-ink-2">{t(`levels.l${level}.body`)}</p>
                  {locked ? (
                    <p className="m-0 text-sm font-semibold text-muted">{t("locked", { level: level - 1, need: Math.round(UNLOCK_SCORE * ROUND_LENGTH) })}</p>
                  ) : (
                    <button type="button" onClick={() => start(level)} className={`${passed ? button.outline : button.primary} h-12 self-start`}>
                      {passed ? t("again") : t("start")}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="m-0 text-sm text-muted">{t("note")}</p>
        </>
      )}
    </>
  );
}

function Question({ round, setRound, onFinish, onQuit }: {
  round: Round;
  setRound: (r: Round) => void;
  onFinish: (r: Round) => void;
  onQuit: () => void;
}) {
  const t = useTranslations("ear");
  const tc = useTranslations("common");
  const { settings } = useSettings();
  const q = round.questions[round.index]!;

  const play = useCallback(() => {
    const { ctx, synth } = engine.audio();
    synth.setVolume(settings.volume);
    const gap = q.sounds.some((s) => "chord" in s) ? 1.6 : 1.1;
    q.sounds.forEach((s, i) => {
      const at = ctx.currentTime + 0.1 + i * gap;
      if ("note" in s) synth.single(s.note, at);
      else synth.strum(s.chord, at);
    });
  }, [q, settings.volume]);

  // Every new question plays once by itself.
  useEffect(() => {
    play();
  }, [play]);

  const label = (option: string) => {
    if (isChordId(option)) return `${option} · ${tc(`chord.${option}`)}`;
    if (/^s[0-5]$/.test(option)) return tc(`string.${option as "s0"}`);
    return t(`options.${option as "first"}`);
  };
  const answered = round.picked !== null;
  const right = round.picked === q.answer;

  const pick = (option: string) => {
    if (answered) return;
    setRound({ ...round, picked: option, right: round.right + (option === q.answer ? 1 : 0) });
  };
  const next = () => {
    if (round.index + 1 >= round.questions.length) onFinish(round);
    else setRound({ ...round, index: round.index + 1, picked: null });
  };

  return (
    <section aria-labelledby="question" className="flex flex-col gap-5 rounded-[var(--radius-hero)] border border-line bg-surface p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="eyebrow text-brass-ink">{t("progress", { level: round.level, n: round.index + 1, total: round.questions.length })}</span>
        <span className="font-mono text-sm text-muted">{t("rightSoFar", { right: round.right })}</span>
      </div>
      <h2 id="question" className="display m-0 text-[30px] font-extrabold">{t(`levels.l${round.level}.prompt`)}</h2>
      <p className="m-0 text-[15px] text-ink-2">{t(`levels.l${round.level}.tip`)}</p>
      <button type="button" onClick={play} className={`${button.outline} h-12 self-start`}>
        <IconSpeaker />
        {t("listen")}
      </button>

      <div role="group" aria-label={t("answers")} className={`grid gap-3 ${q.options.length > 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2"}`}>
        {q.options.map((o) => {
          const isAnswer = answered && o === q.answer;
          const isWrongPick = answered && o === round.picked && !right;
          return (
            <button
              key={o}
              type="button"
              onClick={() => pick(o)}
              disabled={answered}
              className={`flex min-h-16 items-center justify-center rounded-[var(--radius-control)] border-2 px-4 text-[17px] font-extrabold ${
                isAnswer ? "border-good bg-good-soft text-good-ink" : isWrongPick ? "border-bad bg-bad-soft text-bad-ink" : "border-line-strong bg-surface hover:border-ink"
              }`}
            >
              {label(o)}
            </button>
          );
        })}
      </div>

      {answered && (
        <div role="status" className={`flex flex-wrap items-center gap-3 rounded-[16px] px-5 py-3 ${right ? "bg-good-soft text-good-ink" : "bg-bad-soft text-bad-ink"}`}>
          {right ? <IconCheck size={22} /> : <IconAlert />}
          <span className="text-lg font-extrabold">{right ? t("right") : t("wrong", { answer: label(q.answer) })}</span>
          <button type="button" onClick={next} className={`${button.primary} ml-auto h-11`}>
            {round.index + 1 >= round.questions.length ? t("finish") : t("next")}
          </button>
        </div>
      )}
      <button type="button" onClick={onQuit} className="self-start text-sm font-semibold text-muted underline underline-offset-2">{t("quit")}</button>
    </section>
  );
}
