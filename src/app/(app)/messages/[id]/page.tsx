import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Thread } from "@/components/social/thread";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { isBlockedEitherWay, listMessages, markConversationRead, otherOf } from "@/lib/social/repository";
import { eq, and } from "drizzle-orm";
import { blocks } from "@/db/schema";

export async function generateMetadata() {
  const t = await getTranslations("social.messages");
  return { title: t("title") };
}

/** One thread. Opening it reads its messages. */
export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const other = await otherOf(db, id, me.id);
  if (!other) notFound();
  const [list, blockedByMe, blockedEitherWay] = await Promise.all([
    listMessages(db, id),
    db.select({ id: blocks.blockedId }).from(blocks).where(and(eq(blocks.blockerId, me.id), eq(blocks.blockedId, other.id))).then((r) => r.length > 0),
    isBlockedEitherWay(db, me.id, other.id),
    markConversationRead(db, me.id, id),
  ]);
  return <Thread me={me.id} other={other} messages={list.map((m) => ({ ...m, at: m.at.toISOString() }))} blockedByMe={blockedByMe} blocked={blockedEitherWay} />;
}
