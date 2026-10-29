"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSettings } from "@/components/providers";
import { AppMark, IconBook, IconChart, IconHelp, IconSongs, IconToday } from "@/components/ui/icons";
import { TODAY_HREF } from "@/components/ui/links";
import { MicStatus } from "./mic-button";

/**
 * Five doors, one home. "Today" is where a player starts every day and holds
 * the path; "Learn" holds every page that teaches, the basics first. The
 * tuner, the bell and the envelope live in the bar on top.
 */
const NAV = [
  { href: TODAY_HREF, key: "today", Icon: IconToday, also: ["/path"] },
  { href: "/learn", key: "learn", Icon: IconBook, also: ["/basics", "/chords", "/fretboard", "/ear", "/techniques"] },
  { href: "/songs", key: "songs", Icon: IconSongs, also: ["/play"] },
  { href: "/progress", key: "progress", Icon: IconChart, also: [] },
  { href: "/help", key: "help", Icon: IconHelp, also: ["/coach"] },
] as const;

/** Navy on every screen but playing and signing in. On a phone it becomes a bar on top. */
export function Sidebar({ userName }: { userName: string | null }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const active = (href: string, also: readonly string[]) => [href, ...also].some((h) => pathname.startsWith(h));

  return (
    <aside className="flex shrink-0 flex-col gap-5 bg-navy px-[max(16px,env(safe-area-inset-left))] pb-3 pt-[max(16px,env(safe-area-inset-top))] text-on-navy md:sticky md:top-0 md:h-dvh md:w-[248px] md:gap-7 md:px-[18px] md:py-7">
      <Link href={TODAY_HREF} className="flex items-center gap-2.5">
        <AppMark />
        <span className="display text-[19px] font-extrabold">{t("appName")}</span>
      </Link>

      <nav aria-label={t("navLabel")} className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col">
        {NAV.map(({ href, key, Icon, also }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href, also) ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center gap-3 rounded-[var(--radius-field)] px-3 text-[15px] ${
              active(href, also) ? "bg-navy-2 font-bold text-on-navy" : "font-semibold text-on-navy-muted hover:text-on-navy"
            }`}
          >
            <Icon />
            {t(`nav.${key}`)}
          </Link>
        ))}
      </nav>

      <div className="hidden flex-col gap-4 border-t border-navy-line pt-5 md:mt-auto md:flex">
        <MicStatus />
        <label htmlFor="left-handed" className="flex cursor-pointer items-center justify-between gap-3 text-sm text-on-navy-muted">
          {t("leftHanded")}
          <input
            id="left-handed"
            type="checkbox"
            checked={settings.leftHanded}
            onChange={(e) => update({ leftHanded: e.target.checked })}
            className="size-[18px] accent-[var(--color-brass)]"
          />
        </label>
        <Link href="/account" className="flex items-center gap-2.5 text-sm text-on-navy">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-navy-2 font-bold">
            {(userName ?? "?").slice(0, 1).toUpperCase()}
          </span>
          {userName ?? t("signIn")}
        </Link>
      </div>
    </aside>
  );
}
