"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChordDiagram } from "@/components/chord-diagram";
import { useProgress, useSettings } from "@/components/providers";
import { ChordChip } from "@/components/ui/chord-chip";
import { AppMark, IconBack, IconCheck } from "@/components/ui/icons";
import { PATH_HREF, button } from "@/components/ui/links";
import { CHORD_IDS, type ChordId } from "@/lib/music/chords";
import { LESSONS, currentLessonIndex, nextTask, type Progress } from "@/lib/music/path";
import {
  EXPERIENCE,
  GOALS,
  GUITARS,
  MINUTES,
  STYLES,
  TAB_READING,
  guitarNotes,
  placedChords,
  retake,
  type Profile,
} from "@/lib/music/profile";
import { ChordCheck } from "./chord-check";
import { StringsCheck } from "./strings-check";

type Draft = Partial<Omit<Profile, "verifiedChords" | "checked" | "takenAt">> & { leftHanded?: boolean };
type Step = "experience" | "openStrings" | "chords" | "tab" | "hand" | "guitar" | "minutes" | "style" | "goal" | "strings" | "check" | "summary";

/** Path order: the chords as the lessons teach them, so the grid reads like the path. */
const PATH_CHORDS = LESSONS.flatMap((l) => l.newChords);

/**
 * First run: a few questions, a short check at the microphone, then the path
 * starts where the player really is. One question per screen; the answers
 * become progress only at the end.
 */
export function Questionnaire() {
  const t = useTranslations("start");
  const tc = useTranslations("common");
  const router = useRouter();
  const { progress, answer } = useProgress();
  const { settings, update } = useSettings();
  const [draft, setDraft] = useState<Draft>(() => ({
    ...(progress.profile ?? {}),
    knownChords: progress.profile?.knownChords ?? [],
    // Asked again on a first run: the setting may still be the default.
    leftHanded: progress.profile ? settings.leftHanded : undefined,
  }));
  const [result, setResult] = useState<{ verified: ChordId[]; checked: boolean } | null>(null);
  const [stringsHeard, setStringsHeard] = useState<boolean | null>(null);
  const [at, setAt] = useState(0);

  const steps: Step[] = [
    "experience", "openStrings", "chords", "tab", "hand", "guitar", "minutes", "style", "goal",
    ...(draft.knowsOpenStrings ? (["strings"] as const) : []),
    ...((draft.knownChords?.length ?? 0) > 0 ? (["check"] as const) : []),
    "summary",
  ];
  const step = steps[Math.min(at, steps.length - 1)]!;
  const questions = steps.filter((s) => s !== "summary" && s !== "check" && s !== "strings").length;
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setAt((i) => Math.min(i + 1, steps.length - 1));
  // Going back re-opens only the step you land on: a check passed earlier stays passed.
  const back = () => {
    const target = steps[Math.max(at - 1, 0)];
    if (target === "strings") setStringsHeard(null);
    if (target === "check") setResult(null);
    setAt((i) => Math.max(i - 1, 0));
  };

  const answers: Profile | null =
    draft.experience && draft.knowsOpenStrings !== undefined && draft.readsTab && draft.guitar && draft.minutes && draft.style && draft.goal
      ? {
          experience: draft.experience,
          knowsOpenStrings: draft.knowsOpenStrings,
          openStringsHeard: stringsHeard === true,
          knownChords: draft.knownChords ?? [],
          verifiedChords: result?.verified ?? [],
          checked: result?.checked ?? true,
          readsTab: draft.readsTab,
          guitar: draft.guitar,
          minutes: draft.minutes,
          style: draft.style,
          goal: draft.goal,
          takenAt: new Date().toISOString(),
        }
      : null;
  const profile = answers && retake(progress.profile, answers);

  const [saving, setSaving] = useState(false);
  const finish = async () => {
    if (!profile || saving) return;
    setSaving(true);
    if (draft.leftHanded !== undefined) update({ leftHanded: draft.leftHanded });
    await answer(profile);
    router.push(PATH_HREF);
  };

  const answered: Record<Step, boolean> = {
    experience: !!draft.experience,
    openStrings: draft.knowsOpenStrings !== undefined,
    chords: true,
    tab: !!draft.readsTab,
    hand: draft.leftHanded !== undefined,
    guitar: !!draft.guitar,
    minutes: !!draft.minutes,
    style: !!draft.style,
    goal: !!draft.goal,
    strings: stringsHeard !== null,
    check: result !== null,
    summary: true,
  };

  let body: ReactNode = null;
  switch (step) {
    case "experience":
      body = <Choice name="experience" options={EXPERIENCE} value={draft.experience} onPick={(v) => set({ experience: v })} label={(v) => t(`experience.${v}.title`)} detail={(v) => t(`experience.${v}.body`)} />;
      break;
    case "openStrings":
      body = <Choice name="openStrings" options={["yes", "no"] as const} value={draft.knowsOpenStrings === undefined ? undefined : draft.knowsOpenStrings ? "yes" : "no"}
        onPick={(v) => set({ knowsOpenStrings: v === "yes" })} label={(v) => t(`openStrings.${v}.title`)} detail={(v) => t(`openStrings.${v}.body`)} />;
      break;
    case "chords":
      body = (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
          {PATH_CHORDS.map((c) => {
            const on = draft.knownChords?.includes(c) ?? false;
            return (
              <li key={c}>
                <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-card)] border-2 bg-surface p-3 ${on ? "border-brass" : "border-line"}`}>
                  <input type="checkbox" className="sr-only" checked={on}
                    onChange={() => set({ knownChords: on ? draft.knownChords!.filter((x) => x !== c) : CHORD_IDS.filter((x) => x === c || draft.knownChords?.includes(x)) })} />
                  <span className="flex w-full items-center justify-between">
                    <span className="text-3xl font-black [font-stretch:85%]" style={{ color: `var(--color-chord-${c})` }}>{c}</span>
                    <span aria-hidden className={`flex size-6 items-center justify-center rounded-full ${on ? "bg-brass text-on-brass" : "border-2 border-line-strong"}`}>
                      {on && <IconCheck size={14} />}
                    </span>
                  </span>
                  <ChordDiagram chord={c} className="h-auto w-[110px]" leftHanded={draft.leftHanded ?? false} title={tc("diagram", { chord: c, name: tc(`chord.${c}`) })} />
                </label>
              </li>
            );
          })}
        </ul>
      );
      break;
    case "tab":
      body = <Choice name="tab" options={TAB_READING} value={draft.readsTab} onPick={(v) => set({ readsTab: v })} label={(v) => t(`tab.${v}.title`)} detail={(v) => t(`tab.${v}.body`)} />;
      break;
    case "hand":
      body = <Choice name="hand" options={["right", "left"] as const} value={draft.leftHanded === undefined ? undefined : draft.leftHanded ? "left" : "right"}
        onPick={(v) => set({ leftHanded: v === "left" })} label={(v) => t(`hand.${v}.title`)} detail={(v) => t(`hand.${v}.body`)} />;
      break;
    case "guitar":
      body = <Choice name="guitar" options={GUITARS} value={draft.guitar} onPick={(v) => set({ guitar: v })} label={(v) => t(`guitar.${v}.title`)} detail={(v) => t(`guitar.${v}.body`)} />;
      break;
    case "minutes":
      body = <Choice name="minutes" options={MINUTES} value={draft.minutes} onPick={(v) => set({ minutes: v })} label={(v) => t(`minutes.m${v}.title`)} detail={(v) => t(`minutes.m${v}.body`)} />;
      break;
    case "style":
      body = <Choice name="style" options={STYLES} value={draft.style} onPick={(v) => set({ style: v })} label={(v) => t(`style.${v}.title`)} detail={(v) => t(`style.${v}.body`)} />;
      break;
    case "goal":
      body = <Choice name="goal" options={GOALS} value={draft.goal} onPick={(v) => set({ goal: v })} label={(v) => t(`goal.${v}.title`)} detail={(v) => t(`goal.${v}.body`)} />;
      break;
    case "strings":
      body = (
        <StringsCheck
          onDone={(heard) => {
            setStringsHeard(heard);
            next();
          }}
        />
      );
      break;
    case "check":
      body = (
        <ChordCheck
          key={(draft.knownChords ?? []).join()}
          chords={draft.knownChords ?? []}
          onDone={(verified) => {
            setResult(verified === null ? { verified: [], checked: false } : { verified, checked: true });
            next();
          }}
        />
      );
      break;
    case "summary":
      body = profile ? <Summary profile={profile} progress={progress} /> : null;
      break;
  }

  const qIndex = steps.indexOf(step) + 1;
  const title =
    step === "summary" ? t("summary.title") : step === "check" ? t("check.title") : step === "strings" ? t("strings.title") : t(`${step}.question`);
  const help = step === "summary" ? null : step === "check" ? t("check.intro") : step === "strings" ? t("strings.intro") : t(`${step}.help`);

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="flex items-center gap-4 border-b border-line bg-surface px-5 py-4 md:px-8">
        <span className="flex items-center gap-2.5">
          <AppMark size={30} />
          <span className="display text-lg font-extrabold">{tc("appName")}</span>
        </span>
        <div className="mx-auto hidden h-2 w-[320px] max-w-[40vw] overflow-hidden rounded-full bg-sunken sm:block" aria-hidden>
          <div className="h-full rounded-full bg-brass transition-[width]" style={{ width: `${(qIndex / steps.length) * 100}%` }} />
        </div>
        <Link href={PATH_HREF} className="ml-auto text-sm font-semibold text-muted hover:text-ink sm:ml-0">{t("later")}</Link>
      </header>

      <main className="flex flex-1 justify-center px-5 pb-12 pt-10">
        <div className="flex w-full max-w-[760px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="eyebrow text-brass-ink">
              {step === "summary" ? t("summary.eyebrow") : step === "check" ? t("check.eyebrow") : step === "strings" ? t("strings.eyebrow") : t("progress", { n: qIndex, total: questions })}
            </span>
            <h1 className="display m-0 text-[34px] font-extrabold leading-tight">{title}</h1>
            {help && <p className="m-0 max-w-[60ch] text-base leading-relaxed text-ink-2">{help}</p>}
          </div>

          {body}

          {step !== "check" && step !== "strings" && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {at > 0 && (
                <button type="button" onClick={back} className={`${button.outline} h-12`}>
                  <IconBack />
                  {t("back")}
                </button>
              )}
              {step === "summary" ? (
                <button type="button" onClick={() => void finish()} disabled={!profile || saving} className={`${button.brass} ml-auto h-[52px] text-[17px]`}>
                  {t("summary.go")}
                </button>
              ) : (
                <button type="button" onClick={next} disabled={!answered[step]} className={`${button.primary} ml-auto h-12 disabled:opacity-40`}>
                  {step === "chords" && !draft.knownChords?.length ? t("chords.none") : t("next")}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Choice<T extends string | number>({ name, options, value, onPick, label, detail }: {
  name: string;
  options: readonly T[];
  value: T | undefined;
  onPick: (v: T) => void;
  label: (v: T) => string;
  detail: (v: T) => string;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {options.map((o) => {
        const on = value === o;
        return (
          <label key={String(o)} className={`flex cursor-pointer items-center gap-4 rounded-[var(--radius-control)] border-2 bg-surface px-5 py-4 ${on ? "border-brass" : "border-line hover:border-line-strong"}`}>
            <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onPick(o)} />
            <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-brass text-on-brass" : "border-2 border-line-strong"}`}>
              {on && <IconCheck size={14} />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] font-extrabold">{label(o)}</span>
              <span className="text-sm leading-relaxed text-ink-2">{detail(o)}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Where the answers put the player, computed the same way the path will. */
function Summary({ profile, progress }: { profile: Profile; progress: Progress }) {
  const t = useTranslations("start.summary");
  const tp = useTranslations("path");
  const learned = { ...progress.learned };
  const placed = placedChords(profile);
  for (const c of placed) learned[c] = true;
  const after: Progress = { ...progress, learned, profile };
  const index = currentLessonIndex(after);
  const task = nextTask(after);
  // A chord already learned stays learned: answering again never takes progress away.
  const missed = profile.checked ? profile.knownChords.filter((c) => !placed.includes(c) && !progress.learned[c]) : [];
  const chip = (c: ChordId) => <ChordChip key={c} chord={c} />;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-[var(--radius-hero)] bg-navy p-7 text-on-navy">
        <span className="eyebrow text-brass">{t("startEyebrow")}</span>
        <p className="display m-0 text-[28px] font-extrabold">
          {task ? t("start", { n: index, lesson: tp(`lessonTitle.${LESSONS[index]!.id}`) }) : t("allPlaced")}
        </p>
        <p className="m-0 text-base text-on-navy-muted">{t(`why.${profile.experience}`)}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <h2 className="m-0 text-lg font-extrabold">{t("chordsTitle")}</h2>
        {placed.length > 0 ? <div className="flex flex-wrap gap-1.5">{placed.map(chip)}</div> : <p className="m-0 text-[15px] text-ink-2">{t("noChords")}</p>}
        {missed.length > 0 && (
          <p className="m-0 flex flex-wrap items-center gap-1.5 text-[15px] text-ink-2">
            {t("missed")} {missed.map(chip)}
          </p>
        )}
        {!profile.checked && profile.knownChords.length > 0 && <p className="m-0 text-sm text-muted">{t("skipped")}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <h2 className="m-0 text-lg font-extrabold">{t("dailyTitle", { minutes: profile.minutes })}</h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t("daily")}</p>
        {profile.experience === "never" && <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t("fingertips")}</p>}
        {guitarNotes(profile).map((g) => <p key={g} className="m-0 text-[15px] leading-relaxed text-ink-2">{t(`guitar.${g}`)}</p>)}
        {profile.style === "fingerstyle" && <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t("fingerstyle")}</p>}
        {profile.readsTab === "no" && <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t("tab")}</p>}
      </section>
      <p className="m-0 text-sm text-muted">{t("again")}</p>
    </div>
  );
}
