import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { conversationBetween } from "@/lib/social/repository";

/** "Write to X" from a song: the thread with X, made on first use. */
export default async function WithPage({ params }: { params: Promise<{ userId: string }> }) {
  const me = await requireUser();
  const { userId } = await params;
  if (userId === me.id) redirect("/messages");
  const [other] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!other) notFound();
  redirect(`/messages/${await conversationBetween(db, me.id, userId)}`);
}
