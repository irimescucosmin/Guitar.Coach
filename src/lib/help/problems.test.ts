import { describe, expect, it } from "vitest";
import { en } from "@/messages/en";
import { it as itMessages } from "@/messages/it";
import { HELP_GROUPS, PROBLEMS, problemsIn } from "./problems";

describe("help", () => {
  it("puts every problem in a group, each group has at least one", () => {
    for (const g of HELP_GROUPS) expect(problemsIn(g).length).toBeGreaterThan(0);
    expect(new Set(PROBLEMS.map((p) => p.id)).size).toBe(PROBLEMS.length);
  });

  it("has words for every problem and every step, in both languages", () => {
    for (const messages of [itMessages, en]) {
      const p = messages.help.p as Record<string, Record<string, string>>;
      for (const problem of PROBLEMS) {
        const words = p[problem.id];
        expect(words, problem.id).toBeDefined();
        expect(words!.title).toBeTruthy();
        expect(words!.why).toBeTruthy();
        for (let i = 1; i <= problem.fixes; i++) expect(words![`fix${i}`], `${problem.id}.fix${i}`).toBeTruthy();
        expect(words![`fix${problem.fixes + 1}`], `${problem.id} has more steps than declared`).toBeUndefined();
      }
    }
  });
});
