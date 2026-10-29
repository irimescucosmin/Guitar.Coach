/**
 * The safe side of talking to strangers, as rules a test can read. Everything
 * the server refuses is decided here; the screens only show the reason.
 */

export const MESSAGE_MAX_CHARS = 600;
/** Messages a player may send in a day, all conversations together. */
export const MESSAGES_PER_DAY = 60;
/** Messages to someone who never wrote back, before waiting for an answer. */
export const UNANSWERED_LIMIT = 3;
/** Different players who reported someone's messages: from here on that player writes to nobody. */
export const REPORTERS_TO_MUTE = 3;
/** Notifications kept per player; older ones go. */
export const NOTIFICATIONS_KEPT = 100;

export type MessageProblem = "empty" | "tooLong" | "contact" | "link" | "insult";

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|it|net|org|io|app|me|co|eu|info)\b)/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /(\+?\d[\d .-]{7,}\d)/;
/** Enough to stop the plain cases; a word list is not a moderator, reports are. */
const INSULTS = ["stronz", "vaffancul", "coglion", "testa di cazz", "puttan", "fuck you", "idiot", "ritardat", "negr", "frocio"];

/**
 * Why a message cannot go, or null. Contacts and links are refused because
 * a conversation that leaves the app leaves its rules too: what happens
 * here is what we can see and act on when someone reports it.
 */
export function messageProblem(body: string): MessageProblem | null {
  const text = body.trim();
  if (text.length === 0) return "empty";
  if (text.length > MESSAGE_MAX_CHARS) return "tooLong";
  if (EMAIL.test(text) || PHONE.test(text)) return "contact";
  if (LINK.test(text)) return "link";
  const lower = text.toLowerCase();
  if (INSULTS.some((w) => lower.includes(w))) return "insult";
  return null;
}

export type SendRefusal = "blocked" | "closed" | "self" | "muted" | "daily" | "unanswered";

/**
 * Whether a message may be sent, from the facts the server holds. The order
 * is the order of the reasons shown: being blocked beats a daily limit.
 */
export function sendRefusal(facts: {
  senderId: string;
  recipientId: string;
  blockedEitherWay: boolean;
  recipientAccepts: boolean;
  /** Different players who reported the sender's messages. */
  reportedBy: number;
  sentToday: number;
  /** Messages the sender wrote in this conversation and the recipient never answered. */
  unansweredInARow: number;
}): SendRefusal | null {
  if (facts.senderId === facts.recipientId) return "self";
  if (facts.blockedEitherWay) return "blocked";
  if (!facts.recipientAccepts) return "closed";
  if (facts.reportedBy >= REPORTERS_TO_MUTE) return "muted";
  if (facts.sentToday >= MESSAGES_PER_DAY) return "daily";
  if (facts.unansweredInARow >= UNANSWERED_LIMIT) return "unanswered";
  return null;
}

/** The two ids of a pair, in the one order the table stores them. */
export function pairOf(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

export type NotificationKind = "songPassed" | "songPublished" | "songHidden" | "message";

export interface NotificationData {
  songId?: string;
  title?: string;
  /** Who did it: a player's name, never an id the screen would show. */
  by?: string;
  conversationId?: string;
}
