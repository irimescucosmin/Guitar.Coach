"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSettings } from "@/components/providers";
import { AppMark, IconBook, IconChart, IconChords, IconTeacher, IconFretboard, IconEar, IconHelp, IconPath, IconSongs, IconToday, IconTuner } from "@/components/ui/icons";
import { PATH_HREF, TODAY_HREF } from "@/components/ui/links";
import { MicStatus } from "./mic-button";

const NAV = [
  { href: TODAY_HREF, key: "today", Icon: IconToday },
  { href: "/basics", key: "basics", Icon: IconBook },
  { href: PATH_HREF, key: "path", Icon: IconPath },
  { href: "/progress", key: "progress", Icon: IconChart },
  { href: "/fretboard", key: "fretboard", Icon: IconFretboard },
  { href: "/chords", key: "chords", Icon: IconChords },
  { href: "/ear", key: "ear", Icon: IconEar },
  { href: "/songs", key: "songs", Icon: IconSongs },
  { href: "/tools", key: "tools", Icon: IconTuner },
  { href: "/coach", key: "coach", Icon: IconTeacher },
  { href: "/help", key: "help", Icon: IconHelp },
] as const;

/** Navy on every screen but playing and signing in. On a phone it becomes a bar on top. */
export function Sidebar({ userName }: { userName: string | null }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const active = (href: string) => pathname.startsWith(href);

  return (
    <aside className="flex shrink-0 flex-col gap-5 bg-navy px-[max(16px,env(safe-area-inset-left))] pb-3 pt-[max(16px,env(safe-area-inset-top))] text-on-navy md:sticky md:top-0 md:h-dvh md:w-[248px] md:gap-7 md:px-[18px] md:py-7">
      <Link href={PATH_HREF} className="flex items-center gap-2.5">
        <AppMark />
        <span className="display text-[19px] font-extrabold">{t("appName")}</span>
      </Link>

      <nav aria-label={t("navLabel")} className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col">
        {NAV.map(({ href, key, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center gap-3 rounded-[var(--radius-field)] px-3 text-[15px] ${
              active(href) ? "bg-navy-2 font-bold text-on-navy" : "font-semibold text-on-navy-muted hover:text-on-navy"
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
