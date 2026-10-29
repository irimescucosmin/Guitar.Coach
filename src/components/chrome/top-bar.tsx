import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { IconBell, IconMail } from "@/components/ui/icons";

/** Above every page: the bell and the envelope, with what is unread. The counts are read when the page is. */
export async function TopBar({ unread }: { unread: { notifications: number; messages: number } }) {
  const [tn, tm] = await Promise.all([getTranslations("social.notifications"), getTranslations("social.messages")]);
  const items = [
    { href: "/notifications", label: tn("title"), count: unread.notifications, Icon: IconBell },
    { href: "/messages", label: tm("title"), count: unread.messages, Icon: IconMail },
  ];
  return (
    <div className="flex items-center justify-end gap-1">
      {items.map(({ href, label, count, Icon }) => (
        <Link key={href} href={href} aria-label={count > 0 ? `${label}: ${tn("unread", { count })}` : label} className="relative flex size-11 items-center justify-center rounded-[var(--radius-field)] text-ink-2 hover:bg-subtle hover:text-ink">
          <Icon size={22} />
          {count > 0 && (
            <span aria-hidden className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brass px-1 font-mono text-[11px] font-bold text-on-brass">{count > 99 ? "99+" : count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
