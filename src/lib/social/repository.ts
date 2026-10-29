import { and, count, desc, eq, gte, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { blocks, conversations, messageReports, messages, messagingSettings, notifications, user } from "@/db/schema";
import type { Database } from "@/lib/progress/repository";
import { NOTIFICATIONS_KEPT, messageProblem, pairOf, sendRefusal, type NotificationData, type NotificationKind, type SendRefusal } from "./rules";

/* ---------- notifications ---------- */

export interface Notification {
  id: string;
  kind: NotificationKind;
  data: NotificationData;
  read: boolean;
  at: Date;
}

/** Adds a line to a player's bell, and trims what is past NOTIFICATIONS_KEPT. */
export async function notify(db: Database, userId: string, kind: NotificationKind, data: NotificationData): Promise<void> {
  await db.insert(notifications).values({ userId, kind, data });
  const keep = await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(NOTIFICATIONS_KEPT);
  await db.delete(notifications).where(and(eq(notifications.userId, userId), notInArray(notifications.id, keep.map((k) => k.id))));
}

/** The same line is not added twice while the first is still unread (a second message in a thread, say). */
export async function notifyOnce(db: Database, userId: string, kind: NotificationKind, data: NotificationData, key: keyof NotificationData): Promise<void> {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.kind, kind), isNull(notifications.readAt), sql`${notifications.data}->>${key} = ${data[key] ?? ""}`))
    .limit(1);
  if (!existing) await notify(db, userId, kind, data);
}

/** Someone else passed your song: once per player per song, read or not. */
export async function notifyPassed(db: Database, authorId: string, data: NotificationData): Promise<void> {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, authorId), eq(notifications.kind, "songPassed"), sql`${notifications.data}->>'songId' = ${data.songId ?? ""}`, sql`${notifications.data}->>'by' = ${data.by ?? ""}`))
    .limit(1);
  if (!existing) await notify(db, authorId, "songPassed", data);
}

export async function listNotifications(db: Database, userId: string, limit = 30): Promise<Notification[]> {
  const rows = await db
    .select({ id: notifications.id, kind: notifications.kind, data: notifications.data, readAt: notifications.readAt, at: notifications.createdAt })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, kind: r.kind, data: (r.data ?? {}) as NotificationData, read: r.readAt !== null, at: r.at }));
}

export async function unreadNotifications(db: Database, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(row?.n ?? 0);
}

export async function markNotificationsRead(db: Database, userId: string): Promise<void> {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/* ---------- messaging ---------- */

export interface ConversationSummary {
  id: string;
  other: { id: string; name: string };
  lastAt: Date;
  unread: number;
  blocked: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  hidden: boolean;
  at: Date;
}

export async function acceptsMessages(db: Database, userId: string): Promise<boolean> {
  const [row] = await db.select({ accepts: messagingSettings.acceptsMessages }).from(messagingSettings).where(eq(messagingSettings.userId, userId));
  return row?.accepts ?? true;
}

export async function setAcceptsMessages(db: Database, userId: string, accepts: boolean): Promise<void> {
  await db.insert(messagingSettings).values({ userId, acceptsMessages: accepts }).onConflictDoUpdate({ target: messagingSettings.userId, set: { acceptsMessages: accepts } });
}

export async function isBlockedEitherWay(db: Database, x: string, y: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(blocks)
    .where(or(and(eq(blocks.blockerId, x), eq(blocks.blockedId, y)), and(eq(blocks.blockerId, y), eq(blocks.blockedId, x))));
  return Number(row?.n ?? 0) > 0;
}

export async function setBlocked(db: Database, blockerId: string, blockedId: string, blocked: boolean): Promise<void> {
  if (blocked) await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
  else await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
}

/** The conversation between two players, made on first use. */
export async function conversationBetween(db: Database, x: string, y: string): Promise<string> {
  const [a, b] = pairOf(x, y);
  const [found] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.a, a), eq(conversations.b, b)));
  if (found) return found.id;
  const [made] = await db.insert(conversations).values({ a, b }).returning({ id: conversations.id });
  return made!.id;
}

/** The other player of a conversation the viewer is in, or null if the viewer is not. */
export async function otherOf(db: Database, conversationId: string, viewerId: string): Promise<{ id: string; name: string } | null> {
  const [row] = await db.select({ a: conversations.a, b: conversations.b }).from(conversations).where(eq(conversations.id, conversationId));
  if (!row || (row.a !== viewerId && row.b !== viewerId)) return null;
  const otherId = row.a === viewerId ? row.b : row.a;
  const [other] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, otherId));
  return other ?? null;
}

export async function listConversations(db: Database, viewerId: string): Promise<ConversationSummary[]> {
  const rows = await db
    .select({ id: conversations.id, a: conversations.a, b: conversations.b, lastAt: conversations.lastAt })
    .from(conversations)
    .where(or(eq(conversations.a, viewerId), eq(conversations.b, viewerId)))
    .orderBy(desc(conversations.lastAt));
  if (rows.length === 0) return [];
  const otherIds = rows.map((r) => (r.a === viewerId ? r.b : r.a));
  const [names, blockedRows, unread] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, otherIds)),
    db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, viewerId)),
    unreadByConversation(db, viewerId),
  ]);
  const name = new Map(names.map((n) => [n.id, n.name]));
  const blocked = new Set(blockedRows.map((b) => b.id));
  return rows.map((r) => {
    const otherId = r.a === viewerId ? r.b : r.a;
    return { id: r.id, other: { id: otherId, name: name.get(otherId) ?? "?" }, lastAt: r.lastAt, unread: unread.get(r.id) ?? 0, blocked: blocked.has(otherId) };
  });
}

/** Unread, for messages: notifications of kind "message" still unread, per conversation. */
async function unreadByConversation(db: Database, viewerId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ conversation: sql<string>`${notifications.data}->>'conversationId'`, n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, viewerId), eq(notifications.kind, "message"), isNull(notifications.readAt)))
    .groupBy(sql`${notifications.data}->>'conversationId'`);
  return new Map(rows.map((r) => [r.conversation, Number(r.n)]));
}

export async function unreadMessages(db: Database, viewerId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, viewerId), eq(notifications.kind, "message"), isNull(notifications.readAt)));
  return Number(row?.n ?? 0);
}

export async function listMessages(db: Database, conversationId: string, limit = 200): Promise<Message[]> {
  const rows = await db
    .select({ id: messages.id, senderId: messages.senderId, body: messages.body, hidden: messages.hidden, at: messages.createdAt })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

/** Opening a thread reads its message notifications. */
export async function markConversationRead(db: Database, viewerId: string, conversationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, viewerId), eq(notifications.kind, "message"), isNull(notifications.readAt), sql`${notifications.data}->>'conversationId' = ${conversationId}`));
}

export type SendResult = { ok: true; id: string } | { ok: false; reason: SendRefusal | NonNullable<ReturnType<typeof messageProblem>> };

/**
 * Sends a message, every rule checked here from the database's facts:
 * the text, the block, the recipient's choice, the day's count, the
 * unanswered run. The recipient gets one unread line for the thread.
 */
export async function sendMessage(db: Database, senderId: string, recipientId: string, senderName: string, body: string, now = new Date()): Promise<SendResult> {
  const problem = messageProblem(body);
  if (problem) return { ok: false, reason: problem };
  const conversationId = await conversationBetween(db, senderId, recipientId);
  const dayStart = new Date(now.getTime() - 86_400_000);
  const [blockedEitherWay, recipientAccepts, reportedBy, [sentToday], recent] = await Promise.all([
    isBlockedEitherWay(db, senderId, recipientId),
    acceptsMessages(db, recipientId),
    reportersOf(db, senderId),
    db.select({ n: count() }).from(messages).where(and(eq(messages.senderId, senderId), gte(messages.createdAt, dayStart))),
    db.select({ senderId: messages.senderId }).from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt)).limit(10),
  ]);
  let unansweredInARow = 0;
  for (const m of recent) {
    if (m.senderId !== senderId) break;
    unansweredInARow += 1;
  }
  const refusal = sendRefusal({ senderId, recipientId, blockedEitherWay, recipientAccepts, reportedBy, sentToday: Number(sentToday?.n ?? 0), unansweredInARow });
  if (refusal) return { ok: false, reason: refusal };
  const [row] = await db.insert(messages).values({ conversationId, senderId, body: body.trim() }).returning({ id: messages.id });
  await db.update(conversations).set({ lastAt: now }).where(eq(conversations.id, conversationId));
  await notifyOnce(db, recipientId, "message", { conversationId, by: senderName }, "conversationId");
  return { ok: true, id: row!.id };
}

/** Different players who reported this player's messages, whatever the thread. */
export async function reportersOf(db: Database, senderId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${messageReports.userId})` })
    .from(messageReports)
    .innerJoin(messages, eq(messages.id, messageReports.messageId))
    .where(eq(messages.senderId, senderId));
  return Number(row?.n ?? 0);
}

/**
 * A report from the other side of the thread hides the message at once (the
 * reporter does not want it on screen, the sender knows what they wrote) and
 * counts against the sender: at REPORTERS_TO_MUTE different reporters the
 * sender writes to nobody. The text stays for whoever checks it.
 */
export async function reportMessage(db: Database, reporterId: string, messageId: string, reason: "offensive" | "spam" | "contacts" | "other"): Promise<{ hidden: boolean } | null> {
  const [m] = await db.select({ conversationId: messages.conversationId, senderId: messages.senderId }).from(messages).where(eq(messages.id, messageId));
  if (!m || m.senderId === reporterId) return null;
  if (!(await otherOf(db, m.conversationId, reporterId))) return null;
  await db.insert(messageReports).values({ messageId, userId: reporterId, reason }).onConflictDoNothing();
  await db.update(messages).set({ hidden: true }).where(eq(messages.id, messageId));
  return { hidden: true };
}
