/**
 * Prepares a drawn figure for the page.
 *
 * Recraft returns the drawing with a white canvas painted behind it and the
 * palette written out as literal `rgb()`. Served from an `<img>` that is a
 * white slab on a dark page, and it cannot follow the theme. Inlined with the
 * palette mapped onto the tokens, one file reads correctly in both themes: the
 * colours below are exactly the ones `scripts/figures.mjs` asks the model for,
 * so in the light theme the drawing is identical to the file on disk.
 */

/** Token per baked colour. The light value of each token is the colour it replaces. */
const PALETTE = [
  ["rgb(15,28,43)", "var(--color-ink)"],
  ["rgb(217,154,43)", "var(--color-brass)"],
  ["rgb(247,244,238)", "var(--color-subtle)"],
  ["rgb(255,255,255)", "var(--color-surface)"],
] as const;

/** The first path covers the whole canvas in white. Dropping it leaves the card behind the drawing. */
const BACKDROP = /<path[^>]*fill="rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)"[^>]*d="M 0 0 L (\d+) 0 L \1 \1 L 0 \1 L 0 0 z"[^>]*\/>/;

/**
 * A C2PA manifest saying the drawing was generated, about 17 kB of base64. It
 * belongs to the file, which keeps it; repeating it inside the page would add
 * a quarter of the HTML for something no verifier reads from a fragment.
 */
const MANIFEST = /<metadata>[\s\S]*?<\/metadata>/;

/** `none` stretches the drawing to whatever box the CSS gives it. */
const ASPECT = /\s*preserveAspectRatio="[^"]*"/;

/** The intrinsic size, which would win over the CSS once the svg is in the DOM. */
const INTRINSIC = /\s*(width|height)="\d+"/g;

/** The drawing as markup to inline, themed, without the backdrop or the manifest. */
export function themed(svg: string): string {
  let out = svg.replace(MANIFEST, "").replace(BACKDROP, "");
  for (const [baked, token] of PALETTE) {
    out = out.split(baked).join(token);
  }
  const open = out.indexOf(">");
  if (open === -1) return out;
  const root = out
    .slice(0, open)
    .replace(ASPECT, "")
    .replace(INTRINSIC, "")
    .concat(' preserveAspectRatio="xMidYMid meet"');
  return root + out.slice(open);
}
