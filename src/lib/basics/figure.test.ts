import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themed } from "./figure";

const SAMPLE =
  '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="1024" height="1024" preserveAspectRatio="none">' +
  "<metadata>AAAzs2p1bWIAAA</metadata>" +
  '<path transform="translate(0,0)" fill="rgb(255,255,255)" d="M 0 0 L 2048 0 L 2048 2048 L 0 2048 L 0 0 z"/>' +
  '<path fill="rgb(15,28,43)" d="M 1 1"/>' +
  '<path fill="rgb(217,154,43)" d="M 2 2"/>' +
  '<path fill="rgb(255,255,255)" d="M 3 3"/>' +
  "</svg>";

describe("themed", () => {
  const out = themed(SAMPLE);

  it("drops the white canvas painted behind the drawing", () => {
    expect(out).not.toContain("L 2048 2048 L 0 2048");
  });

  it("keeps the white shapes that are part of the drawing", () => {
    expect(out).toContain('d="M 3 3"');
  });

  it("maps the baked palette onto the tokens", () => {
    expect(out).toContain("var(--color-ink)");
    expect(out).toContain("var(--color-brass)");
    expect(out).toContain("var(--color-surface)");
    expect(out).not.toMatch(/rgb\(15,28,43\)|rgb\(217,154,43\)/);
  });

  it("drops the manifest, which belongs to the file and not to the page", () => {
    expect(out).not.toContain("<metadata>");
  });

  it("lets the CSS size it without stretching it", () => {
    expect(out).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(out).not.toMatch(/<svg[^>]*\swidth="\d+"/);
    expect(out).toContain('viewBox="0 0 2048 2048"');
  });

  it("leaves the shapes alone", () => {
    expect(out).toContain('d="M 1 1"');
    expect(out).toContain('d="M 2 2"');
  });
});

/** The light value of each token, from globals.css. */
const LIGHT: Record<string, string> = {
  "var(--color-ink)": "rgb(15,28,43)",
  "var(--color-brass)": "rgb(217,154,43)",
  "var(--color-surface)": "rgb(255,255,255)",
};

describe("the light theme", () => {
  it("puts back exactly the colours the drawing was made with", () => {
    let back = themed(SAMPLE);
    for (const [token, colour] of Object.entries(LIGHT)) back = back.split(token).join(colour);
    // Everything the mapping touched is identical to the file; only the backdrop is gone.
    expect(back).toContain('fill="rgb(15,28,43)"');
    expect(back).toContain('fill="rgb(217,154,43)"');
    expect(back).toContain('fill="rgb(255,255,255)" d="M 3 3"');
    expect(back).not.toContain("var(--color-");
  });
});

describe("the drawings on disk", () => {
  // They are generated, so this guards the assumption the mapping rests on:
  // the model answered with the palette scripts/figures.mjs asked for.
  // A figure taken down to be regenerated (the page shows its placeholder) is not on disk yet.
  const onDisk = ["parts", "sit", "left", "pick"].filter((id) => existsSync(`${process.cwd()}/public/figures/${id}.svg`));
  for (const id of onDisk) {
    it(`${id} carries no backdrop and no baked palette once themed`, () => {
      const out = themed(readFileSync(`${process.cwd()}/public/figures/${id}.svg`, "utf8"));
      expect(out).not.toContain("<metadata>");
      expect(out).not.toMatch(/fill="rgb\(255,\s*255,\s*255\)"[^>]*d="M 0 0 L 2048 0/);
      expect(out).toContain("var(--color-ink)");
      expect(out.length).toBeLessThan(readFileSync(`${process.cwd()}/public/figures/${id}.svg`, "utf8").length);
    });
  }
});
