import { getTranslations } from "next-intl/server";
import { FretboardMap } from "@/components/fretboard/fretboard-map";
import { NoteDrill } from "@/components/fretboard/note-drill";

export async function generateMetadata() {
  const t = await getTranslations("fretboard");
  return { title: t("title") };
}

const RULES = ["rule1", "rule2", "rule3", "rule4"] as const;
const NAMES = [
  ["La", "A"], ["Si", "B"], ["Do", "C"], ["Re", "D"], ["Mi", "E"], ["Fa", "F"], ["Sol", "G"],
] as const;

export default async function FretboardPage() {
  const t = await getTranslations("fretboard");
  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">{t("eyebrow")}</span>
        <h1 className="display m-0 text-[40px] font-extrabold leading-tight">{t("title")}</h1>
        <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("intro")}</p>
      </header>

      <section aria-label={t("rules")} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {RULES.map((r, i) => (
          <div key={r} className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-[18px]">
            <span className="font-mono text-[13px] text-brass-ink">{i + 1}</span>
            <h2 className="m-0 text-[17px] font-extrabold">{t(`${r}.title`)}</h2>
            <p className="m-0 text-sm leading-relaxed text-ink-2">{t(`${r}.body`)}</p>
          </div>
        ))}
      </section>

      <FretboardMap />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <NoteDrill />
        <section className="flex flex-col gap-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="m-0 text-xl font-extrabold">{t("namesTitle")}</h2>
          <p className="m-0 text-sm leading-relaxed text-ink-2">{t("namesBody")}</p>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {NAMES.map(([it, en]) => (
              <span key={en} className="flex flex-col rounded-[10px] bg-subtle py-2.5 font-extrabold">
                {it}
                <span className="font-mono text-[15px] font-semibold text-brass-ink">{en}</span>
              </span>
            ))}
          </div>
          <p className="m-0 text-sm leading-relaxed text-ink-2">{t.rich("suffixes", { b: (chunks) => <strong>{chunks}</strong> })}</p>
        </section>
      </div>
    </>
  );
}
