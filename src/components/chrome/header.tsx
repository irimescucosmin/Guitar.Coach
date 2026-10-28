"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSettings } from "@/components/providers";
import { MicButton } from "./mic-button";

const NAV = [
  { href: "/", key: "path" },
  { href: "/play", key: "play" },
  { href: "/chords", key: "chords" },
  { href: "/tools", key: "tools" },
] as const;

export function Header({ userName }: { userName: string | null }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="flex flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">{t("appName")}</span>
          <span className="text-xs text-muted">{t("tagline")}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              id="left-handed"
              type="checkbox"
              checked={settings.leftHanded}
              onChange={(e) => update({ leftHanded: e.target.checked })}
              className="size-4 accent-[var(--color-accent)]"
            />
            {t("leftHanded")}
          </label>
          <MicButton />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="primary">
        {NAV.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${
              active(href) ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t(`nav.${key}`)}
          </Link>
        ))}
        <Link
          href="/account"
          aria-current={active("/account") ? "page" : undefined}
          className={`-mb-px ml-auto whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${
            active("/account") ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {userName ?? t("nav.account")}
        </Link>
      </nav>
    </header>
  );
}
