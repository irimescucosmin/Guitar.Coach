"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ChordId, Finger } from "@/lib/music/chords";
import { transition } from "@/lib/music/transitions";

/** One sentence on how to get from one chord to the next, worked out from the two shapes. */
export function useTransitionHint() {
  const t = useTranslations("transition");
  const locale = useLocale();
  const list = (fingers: Finger[]) =>
    new Intl.ListFormat(locale, { type: "conjunction" }).format(fingers.map((f) => t(`finger.f${f as 1}`)));

  return (from: ChordId, to: ChordId): string => {
    if (from === to) return t("same");
    const tr = transition(from, to);
    const parts: string[] = [];
    if (tr.stay.length) parts.push(t("stay", { fingers: list(tr.stay), count: tr.stay.length }));
    if (tr.slide.length) parts.push(t("slide", { fingers: list(tr.slide.map((s) => s.finger)), count: tr.slide.length }));
    const others = [...tr.move, ...tr.arrive];
    if (others.length) parts.push(t("move", { fingers: list(others), count: others.length }));
    let sentence = parts.join(t("then"));
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
    // With nothing to hold on to, say where to start, unless the sentence already does.
    const first = tr.slide.length ? tr.slide.map((s) => s.finger) : others;
    const saidFirst = first.length === 1 && first[0] === tr.lead;
    if (!tr.stay.length && tr.lead && !saidFirst) sentence += " " + t("lead", { finger: t(`finger.f${tr.lead as 1}`) });
    return sentence;
  };
}

export function TransitionHint({ from, to, className = "" }: { from: ChordId; to: ChordId; className?: string }) {
  const hint = useTransitionHint();
  return <span className={className}>{hint(from, to)}</span>;
}
