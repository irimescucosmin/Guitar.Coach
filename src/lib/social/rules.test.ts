import { describe, expect, it } from "vitest";
import { MESSAGES_PER_DAY, REPORTERS_TO_MUTE, UNANSWERED_LIMIT, messageProblem, pairOf, sendRefusal } from "./rules";

describe("messages: what can be said", () => {
  it("refuses empty, too long, contacts, links and plain insults", () => {
    expect(messageProblem("   ")).toBe("empty");
    expect(messageProblem("a".repeat(601))).toBe("tooLong");
    expect(messageProblem("scrivimi a mario.rossi@example.com")).toBe("contact");
    expect(messageProblem("il mio numero è +39 333 123 4567")).toBe("contact");
    expect(messageProblem("guarda qui https://example.com/video")).toBe("link");
    expect(messageProblem("vai su esempio.it")).toBe("link");
    expect(messageProblem("sei uno stronzo")).toBe("insult");
    expect(messageProblem("Bel giro! Il cambio G-D mi viene meglio col medio che parte prima.")).toBeNull();
    expect(messageProblem("Lo suono a 100 bpm, tu?")).toBeNull();
  });
});

describe("messages: who can write to whom", () => {
  const ok = { senderId: "a", recipientId: "b", blockedEitherWay: false, recipientAccepts: true, reportedBy: 0, sentToday: 0, unansweredInARow: 0 };
  it("lets a message through, and refuses in the order of the reasons", () => {
    expect(sendRefusal(ok)).toBeNull();
    expect(sendRefusal({ ...ok, recipientId: "a" })).toBe("self");
    expect(sendRefusal({ ...ok, blockedEitherWay: true, recipientAccepts: false })).toBe("blocked");
    expect(sendRefusal({ ...ok, recipientAccepts: false })).toBe("closed");
    expect(sendRefusal({ ...ok, reportedBy: REPORTERS_TO_MUTE })).toBe("muted");
    expect(sendRefusal({ ...ok, sentToday: MESSAGES_PER_DAY })).toBe("daily");
    expect(sendRefusal({ ...ok, unansweredInARow: UNANSWERED_LIMIT })).toBe("unanswered");
    expect(sendRefusal({ ...ok, unansweredInARow: UNANSWERED_LIMIT - 1 })).toBeNull();
  });
  it("stores a pair in one order", () => {
    expect(pairOf("b", "a")).toEqual(["a", "b"]);
    expect(pairOf("a", "b")).toEqual(["a", "b"]);
  });
});
