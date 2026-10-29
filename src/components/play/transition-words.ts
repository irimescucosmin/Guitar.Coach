import { getTranslations } from "next-intl/server";
import type { ChordId, Finger } from "@/lib/music/chords";
import { transition } from "@/lib/music/transitions";

/**
 * The change hint as a server-side function, for printed sheets. Same words
 * as `useTransitionHint`, which is the hook the screens use.
 */
export async function transitionWords(locale: string): Promise<(from: ChordId, to: ChordId) => string> {
  const t = await getTranslations("transition");
  const list = (fingers: Finger[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(fingers.map((f) => t(`finger.f${f as 1}`)));
  return (from, to) => {
    if (from === to) return t("same");
    const tr = transition(from, to);
    const parts: string[] = [];
    if (tr.stay.length) parts.push(t("stay", { fingers: list(tr.stay), count: tr.stay.length }));
    if (tr.slide.length) parts.push(t("slide", { fingers: list(tr.slide.map((s) => s.finger)), count: tr.slide.length }));
    const others = [...tr.move, ...tr.arrive];
    if (others.length) parts.push(t("move", { fingers: list(others), count: others.length }));
    let sentence = parts.join(t("then"));
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
    const first = tr.slide.length ? tr.slide.map((s) => s.finger) : others;
    const saidFirst = first.length === 1 && first[0] === tr.lead;
    if (!tr.stay.length && tr.lead && !saidFirst) sentence += " " + t("lead", { finger: t(`finger.f${tr.lead as 1}`) });
    return sentence;
  };
}
