import { NotificationList } from "@/components/social/notification-list";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/social/repository";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("social.notifications");
  return { title: t("title") };
}

/** What happened around the player's songs and messages, newest first. */
export default async function NotificationsPage() {
  const me = await requireUser();
  const list = await listNotifications(db, me.id);
  return <NotificationList list={list.map((n) => ({ ...n, at: n.at.toISOString() }))} />;
}
