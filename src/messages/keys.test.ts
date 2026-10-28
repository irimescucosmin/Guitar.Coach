import { describe, expect, it as test } from "vitest";
import { en } from "./en";
import { it } from "./it";

const flatten = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" && v !== null ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const values = (obj: object): string[] =>
  Object.values(obj).flatMap((v) => (typeof v === "object" && v !== null ? values(v) : [String(v)]));

describe("messages", () => {
  test("have the same keys in Italian and English", () => {
    expect(flatten(en).sort()).toEqual(flatten(it).sort());
  });

  test("never use an em dash in Italian", () => {
    expect(values(it).filter((v) => v.includes("—"))).toEqual([]);
  });
});
