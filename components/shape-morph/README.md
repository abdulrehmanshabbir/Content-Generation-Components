# Shape Morphing — Template 02

One path interpolates into another — "A becomes B" — and then takes itself apart
to show how. 17.4s, 30fps, five scenes.

| # | at | scene |
|---|------|-------|
| 1 | 0.0 | title — A BECOMES B, a circle breathing into a square behind it |
| 2 | 2.6 | the claim — circle → star, with an A → B track showing the value of `t` |
| 3 | 7.2 | how it works — sample, align, lerp, each demonstrated on the shape |
| 4 | 13.5 | the chain — heart → cross → play → drop at an even tempo |
| 5 | 15.7 | end card |

## The technique

Three steps, and the whole thing is in them:

```js
const a = morph.sample(pathA, 240);   // walk both outlines at even intervals
const b = morph.align(a, morph.sample(pathB, 240));
const d = morph.toPath(morph.lerp(a, b, t));
```

**Sample** — walk both outlines at even arc-length intervals so each becomes the
same ordered list of points. The browser parses the `d` for us via
`getPointAtLength`, so lines, curves and arcs all work, and any SVG path you
paste in works too.

**Align** — rotate the second list's starting index, and match its winding, so
point *i* on A corresponds to point *i* on B. Skip this step and the shape turns
itself inside out on the way across. The piece shows that start point walking
around the outline into place.

**Lerp** — move every point along a straight line between its two positions.
Scene 3 draws those lines before the morph runs, so you can see the shape travel
along them.

For a chain of shapes, `morph.sequence([...])` aligns each to the one before it,
once, at build time:

```js
const seq = HF.morph.sequence([SHAPES.heart, SHAPES.cross, SHAPES.play], 240);
path.setAttribute('d', seq.at(0, t));    // first morph, at t
```

## Motion

Deliberately plain, and worth copying:

| what is moving | curve |
|---|---|
| anything arriving | `E.quintOut` — fast, then settles |
| anything leaving | `E.cubicIn` — eases away, then goes |
| a morph, or anything travelling between two states | `E.quintInOut` |
| the idle ping-pong morph in the title | `E.sineInOut` — no jerk at the turn |

Nothing overshoots and nothing strobes: `flashes` and `edges` are both empty.

## Shapes

`SHAPES` in `component.js` holds seven closed contours — circle, square, star,
cross, play, heart, drop — each in a 1000×1000 box centred on (0,0). Add your
own as a path string, or paste one out of any vector tool; it only has to be a
single closed contour, since a contour cannot interpolate into two.

## Palette

`--ground` `#ecedf3`, `--ink` `#20242e`, `--accent` `#9aa7e6`. The shape is
accent, the outlines and points are ink.

## Render

```bash
node tools/render.mjs shape-morph
```

```bash
node tools/render.mjs shape-morph --ar 16x9
```

## Preview

[`previews/shape-morph-9x16.mp4`](../../previews/shape-morph-9x16.mp4) · [`previews/shape-morph-16x9.mp4`](../../previews/shape-morph-16x9.mp4)
