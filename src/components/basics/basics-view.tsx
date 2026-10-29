import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { button } from "@/components/ui/links";
import { GuitarParts, LeftHand, PickGrip, Posture, ReadBox } from "./figures";

const TOPICS = ["parts", "sit", "left", "right", "pick", "box", "tune", "pain"] as const;

/**
 * Before the first chord: how to hold the guitar and the hands, read a chord
 * box, and what hurts and what should not. Server component: plain text and
 * drawings, the same ones the printed guide uses.
 */
export async function BasicsView({ print = false }: { print?: boolean }) {
  const t = await getTranslations("basics");
  const parts = {
    body: t("figures.body"), neck: t("figures.neck"), headstock: t("figures.headstock"), tuners: t("figures.tuners"),
    nut: t("figures.nut"), frets: t("figures.frets"), soundhole: t("figures.soundhole"), bridge: t("figures.bridge"), strings: t("figures.strings"),
  };
  const box = { nut: t("figures.boxNut"), strings: t("figures.boxStrings"), frets: t("figures.boxFrets"), dot: t("figures.boxDot"), open: t("figures.boxOpen"), muted: t("figures.boxMuted") };
  const figure = (k: (typeof TOPICS)[number]) => {
    switch (k) {
      case "parts": return <GuitarParts labels={parts} />;
      case "sit": return <Posture />;
      case "left": return <LeftHand />;
      case "pick": return <PickGrip labels={{ thumb: t("figures.thumb"), index: t("figures.index"), tip: t("figures.tip") }} />;
      case "box": return <ReadBox labels={box} />;
      default: return null;
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[64ch] flex-col gap-1.5">
          <span className="eyebrow text-muted">{t("eyebrow")}</span>
          <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
          <p className="m-0 text-base leading-relaxed text-ink-2">{t("intro")}</p>
        </div>
        {!print && (
          <Link href="/print/basics" target="_blank" className={`${button.outline} h-11`}>
            {t("print")}
          </Link>
        )}
      </header>

      {TOPICS.map((k, i) => {
        const steps = Array.from({ length: Number(t(`${k}.steps`)) }, (_, n) => t(`${k}.s${n + 1}` as "parts.s1"));
        const fig = figure(k);
        return (
          <section key={k} id={k} aria-labelledby={`b-${k}`} className={`flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6 ${print ? "break-inside-avoid" : ""}`}>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-brass-ink">{i + 1}</span>
              <h2 id={`b-${k}`} className="m-0 text-2xl font-extrabold">{t(`${k}.title`)}</h2>
            </div>
            <div className={`grid gap-6 ${fig ? (k === "parts" ? "md:grid-cols-[1fr_1.1fr]" : "md:grid-cols-[1fr_280px]") : ""}`}>
              <div className="flex flex-col gap-3">
                <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t(`${k}.body`)}</p>
                <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
                  {steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                {k === "pain" && <p className="m-0 rounded-[var(--radius-control)] bg-bad-soft px-4 py-3 text-[15px] font-semibold text-bad-ink">{t("pain.warn")}</p>}
              </div>
              {fig && <div className="text-ink">{fig}</div>}
            </div>
          </section>
        );
      })}
      {!print && (
        <p className="m-0 text-sm text-muted">
          {t("next")} <Link href="/today" className="font-bold text-brass-ink underline underline-offset-2">{t("nextGo")}</Link>
        </p>
      )}
    </>
  );
}
