import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChordDiagram } from "@/components/chord-diagram";
import { ChordChip } from "@/components/ui/chord-chip";
import { AppMark, IconAlert, IconChevron } from "@/components/ui/icons";
import { button } from "@/components/ui/links";
import { LESSONS } from "@/lib/music/path";
import { SONGS, chordsOf, type Song } from "@/lib/music/songs";

const WHY = ["hear", "next", "play"] as const;
const STEPS = ["answer", "shape", "time"] as const;
const INSIDE = ["path", "tuner", "hint"] as const;
/** The lesson whose songs a visitor plays first: two chords, four songs. */
const FIRST_SONGS_LESSON = 2;
/** The open B string of a G chord: the one a finger lying flat touches first. */
const FLAGGED_STRING = 4;

/** The lesson that first lets you play a song: where it shows up on the path. */
const lessonOf = (song: Song) => LESSONS.findIndex((l) => l.songs.includes(song.id));

/** The presentation page: what the app is for, how it works, what you can play. Signed-out visitors only. */
export async function Landing({ providers }: { providers: ("google" | "apple")[] }) {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");
  const tp = await getTranslations("play");
  const traditional = SONGS.filter((s) => s.group === "traditional").sort((a, b) => lessonOf(a) - lessonOf(b));
  const first = traditional.filter((s) => lessonOf(s) === FIRST_SONGS_LESSON);
  const progressions = SONGS.filter((s) => s.group === "progression");
  const signUp = `${button.brass} h-[52px] text-[17px]`;

  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-5 py-4">
          <span className="flex items-center gap-2.5">
            <AppMark size={30} />
            <span className="display text-lg font-extrabold">{tc("appName")}</span>
          </span>
          <nav aria-label={t("nav")} className="ml-auto flex items-center gap-2">
            <a href="#songs" className="hidden px-3 text-sm font-semibold text-muted hover:text-ink sm:inline">{t("navSongs")}</a>
            <Link href="/account" className="px-3 text-sm font-bold text-ink hover:underline">{t("signIn")}</Link>
            <Link href="/account?mode=signup" className={`${button.primary} h-10 px-4 text-sm`}>{t("signUp")}</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1120px] flex-col gap-20 px-5 pb-20 pt-14">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-5">
            <h1 className="display m-0 text-[48px] font-extrabold leading-[1.02] sm:text-[60px]">{t("title")}</h1>
            <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-ink-2">{t("intro")}</p>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/account?mode=signup" className={signUp}>{t("cta")}</Link>
                <span className="text-sm text-muted">{t(`ctaNote.${providers.length === 2 ? "both" : (providers[0] ?? "none")}`)}</span>
              </div>
              <p className="m-0 max-w-[52ch] text-sm text-muted">{t("needs")}</p>
            </div>
          </div>

          {/* What the play screen shows, made of the same pieces: a chord with a silent string, the band that says which, the next chord. */}
          <figure className="m-0 flex flex-col gap-3">
            <div aria-hidden className="grid grid-cols-[1.25fr_1fr] gap-4">
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-hero)] border border-line bg-surface p-5">
                <span className="eyebrow self-start text-muted">{tp("now")}</span>
                <span className="self-start text-[88px] font-black leading-[0.85] [font-stretch:85%]" style={{ color: "var(--color-chord-G)" }}>G</span>
                <ChordDiagram chord="G" flagged={[FLAGGED_STRING]} className="h-auto w-full max-w-[170px]" title={tc("diagram", { chord: "G", name: tc("chord.G") })} />
              </div>
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-hero)] border-[3px] border-brass bg-surface p-5">
                <span className="eyebrow self-start text-brass-ink">{tp("upNext")}</span>
                <span className="self-start text-[56px] font-black leading-none [font-stretch:85%]" style={{ color: "var(--color-chord-D)" }}>D</span>
                <ChordDiagram chord="D" className="h-auto w-full max-w-[120px]" title={tc("diagram", { chord: "D", name: tc("chord.D") })} />
              </div>
              <p className="col-span-2 m-0 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[16px] bg-warn-soft px-5 py-3 text-warn">
                <IconAlert size={20} />
                <span className="font-extrabold">{tp("feedback.openSilent", { string: tc(`string.s${FLAGGED_STRING}`) })}</span>
                <span className="text-sm">{tp("feedback.freeOpenString")}</span>
              </p>
            </div>
            <figcaption className="text-sm text-muted">{t("heroCaption")}</figcaption>
          </figure>
        </section>

        <section aria-labelledby="why" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="why" className="display m-0 text-[36px] font-extrabold">{t("whyTitle")}</h2>
            <p className="m-0 max-w-[60ch] text-base leading-relaxed text-ink-2">{t("whyIntro")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {WHY.map((k) => (
              <article key={k} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6">
                <h3 className="m-0 text-lg font-extrabold">{t(`why.${k}.problem`)}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-2">{t(`why.${k}.answer`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="how" className="grid grid-cols-1 gap-8 rounded-[var(--radius-hero)] bg-navy p-8 text-on-navy md:grid-cols-[1fr_1.4fr] md:p-12">
          <div className="flex flex-col gap-3">
            <h2 id="how" className="display m-0 text-[36px] font-extrabold">{t("howTitle")}</h2>
            <p className="m-0 text-base leading-relaxed text-on-navy-muted">{t("howIntro")}</p>
          </div>
          <ol className="m-0 flex list-none flex-col gap-6 p-0">
            {STEPS.map((k, i) => (
              <li key={k} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brass font-mono text-lg font-semibold text-on-brass">{i + 1}</span>
                <span className="flex flex-col gap-1">
                  <strong className="text-lg">{t(`how.${k}.title`)}</strong>
                  <span className="text-[15px] leading-relaxed text-on-navy-muted">{t(`how.${k}.body`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="inside" className="flex flex-col gap-6">
          <h2 id="inside" className="display m-0 text-[36px] font-extrabold">{t("insideTitle")}</h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {INSIDE.map((k) => (
              <li key={k} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <h3 className="m-0 text-base font-extrabold">{t(`inside.${k}.title`)}</h3>
                <p className="m-0 text-sm leading-relaxed text-ink-2">{t(`inside.${k}.body`)}</p>
              </li>
            ))}
          </ul>
          <p className="m-0 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{t("insideMore")}</p>
        </section>

        <section id="songs" aria-labelledby="songs-title" className="flex scroll-mt-6 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="songs-title" className="display m-0 text-[36px] font-extrabold">{t("songsTitle", { count: traditional.length })}</h2>
            <p className="m-0 max-w-[60ch] text-base leading-relaxed text-ink-2">{t("songsIntro", { count: first.length })}</p>
          </div>
          <ul aria-label={t("songsFirst")} className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {first.map((song) => (
              <li key={song.id} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <span className="text-lg font-extrabold">{song.title}</span>
                <span className="text-[13px] text-muted">{tp(`origin.${song.origin}`)}</span>
                <span className="inline-flex flex-wrap gap-1">{chordsOf(song).map((c) => <ChordChip key={c} chord={c} />)}</span>
              </li>
            ))}
          </ul>
          <details className="group rounded-[var(--radius-card)] border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold marker:content-none group-open:border-b group-open:border-line">
              {t("songsAll", { count: traditional.length })}
              <span className="transition-transform group-open:rotate-180"><IconChevron /></span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[15px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                    <th scope="col" className="px-5 py-3.5 font-bold">{t("cols.song")}</th>
                    <th scope="col" className="px-3 py-3.5 font-bold">{t("cols.chords")}</th>
                    <th scope="col" className="px-5 py-3.5 text-right font-bold">{t("cols.from")}</th>
                  </tr>
                </thead>
                <tbody>
                  {traditional.map((song) => (
                    <tr key={song.id} className="border-t border-line">
                      <td className="px-5 py-3">
                        <span className="block font-extrabold">{song.title}</span>
                        <span className="text-[13px] text-muted">{tp(`origin.${song.origin}`)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex flex-wrap gap-1">{chordsOf(song).map((c) => <ChordChip key={c} chord={c} />)}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-ink-2">{t("lesson", { n: lessonOf(song) })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong p-6">
            <h3 className="m-0 text-lg font-extrabold">{t("progressionsTitle")}</h3>
            <p className="m-0 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{t("progressionsBody")}</p>
            <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
              {progressions.map((song) => (
                <li key={song.id} className="flex items-center gap-2">
                  <span className="font-bold">{song.title}</span>
                  <span className="inline-flex gap-1">{chordsOf(song).map((c) => <ChordChip key={c} chord={c} />)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="free" className="flex flex-col items-start gap-4 rounded-[var(--radius-hero)] border-[3px] border-brass bg-surface p-8 md:p-12">
          <h2 id="free" className="display m-0 text-[36px] font-extrabold">{t("freeTitle")}</h2>
          <p className="m-0 max-w-[64ch] text-base leading-relaxed text-ink-2">{t("freeBody")}</p>
          <Link href="/account?mode=signup" className={signUp}>{t("cta")}</Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-sm text-muted">
          <span>{tc("appName")}</span>
          <span>{t("footer")}</span>
          <Link href="/terms" className="font-semibold underline underline-offset-2 hover:text-ink">{t("footerTerms")}</Link>
        </div>
      </footer>
    </div>
  );
}
