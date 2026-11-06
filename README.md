# Hyperframes

Frame-exact motion components. Author them in the browser, scrub them frame by
frame, export them to MP4 — and get the same pixels either way.

```
npm install            # playwright, for rendering (ffmpeg must be on PATH)
npm start              # http://localhost:5173 — the component gallery
```

Open a component and press <kbd>space</kbd>. `←` / `→` steps one frame,
<kbd>shift</kbd> + arrows steps ten, and the 9:16 / 1:1 / 16:9 buttons rebuild
the piece in that aspect ratio.

```
npm run render kinetic-typography              # out/kinetic-typography-9x16.mp4
npm run render kinetic-typography -- --ar 16x9
npm run new my-component "My Component"        # scaffold a new one
```

## Components

| | component | what it is | preview |
|---|---|---|---|
| 01 | [Kinetic Typography](components/kinetic-typography) | Bold type that moves, scales and snaps to a voice beat map, cut with clips and images. | [9:16](previews/kinetic-typography-9x16.mp4) · [16:9](previews/kinetic-typography-16x9.mp4) |
| 02 | [Shape Morphing](components/shape-morph) | One path interpolates into another — "A becomes B" — and then shows its working. | [9:16](previews/shape-morph-9x16.mp4) · [16:9](previews/shape-morph-16x9.mp4) |
| — | [Starter](components/_starter) | The smallest working component. Copy it to begin a new one. | [9:16](previews/_starter-9x16.mp4) |

`previews/` holds a rendered MP4 and a poster frame for each component, plus its
`*-beats.json` — the word-onset map, for cutting music and VO against the type.
They are rendered output, not sources: `npm run render <component>` regenerates
any of them.

## The idea

Every property of every layer is a pure function of the frame index. No CSS
keyframes, no state accumulated across `requestAnimationFrame`. Three things
fall out of that one constraint:

* `seek(f)` is exact, so scrubbing is frame accurate
* the offline render reproduces the browser pixel for pixel
* timing is authored in **seconds against a voice beat map**, not in transitions

The rule a component has to keep: `tick()` reads time and writes transforms.
Never accumulate between frames.

## Layout

```
engine/            shared, and components never edit it
  hyperframes.js     math, easings, text splitting, layout units, Film, registry
  visuals.js         procedural footage + grain; derives its colours from the stage
  morph.js           optional: path interpolation — sample, align, lerp
  player.js          mounts a component: stage, fx layers, hud, transport, render hooks
  stage.css          colour contract, stage, fx layers, type primitives, the highlight
components/
  manifest.js        the list the gallery reads
  _starter/          the smallest working component — copy this to begin
  kinetic-typography/
  shape-morph/
    component.js       timing, voice beat map, media slots, scenes
    component.css      this component's three colours
    index.html         loads the engine, then this component, then mounts it
    media/             its own clips and images
    README.md
tools/
  render.mjs         Chromium + ffmpeg exporter
  serve.mjs          dependency-free static server
  new-component.mjs  scaffolds from _starter and registers it
out/                 exports land here
```

Each component is **independent**: its own folder, its own page, its own
palette, its own media, its own README. It can be opened, rendered, copied,
deleted or handed to someone else on its own. What it shares is the engine —
one copy, not one per component.

## Writing a component

```bash
npm run new my-component "My Component"
```

Then edit `components/my-component/component.js`. The shape never changes:

```js
(function () {
  const { el, px, split, prog, lerp, E, T, landWord, u, vw, vh, VIS } = HF.kit;

  const C = {
    id: 'my-component', title: 'My Component',
    fps: 30, duration: 6.0,
    voice:   [{ at: 0.5, w: 'HELLO' }],     // when each word lands
    media:   { hero: null },                // null → procedural clip
    flashes: [{ at: 2.3, dur: 0.09, a: 0.9 }],
    edges:   [1.3],
    hud:     { tl: 'HYPERFRAMES', bl: 'MY COMPONENT', fadeAt: 5.4 }
  };

  const SCENE = {
    name: 'read', in: 0, out: 6,
    build(host) { /* make the DOM once, return refs */ },
    tick(refs, lt, gt) { /* position it for this instant */ }
  };

  C.scenes = [SCENE];
  HF.define(C);
})();
```

`build()` runs once per aspect ratio. `tick()` runs per frame: `lt` is seconds
since the scene opened, `gt` is seconds since the start of the piece.

### What the kit gives you

| | |
|---|---|
| `prog(t, at, dur)` | 0→1 progress through a window |
| `E` | easings — `expoOut`, `backOut`, `pulse`, `spring`, `snap`, … |
| `T(node, {x,y,yp,s,r,skew,o,blur})` | one style write per layer per frame |
| `split(text, 'word'\|'char')` | masked boxes to animate |
| `landWord(inner, block, gt, at, opt)` | the shared "lands hard" move |
| `riseWord(inner, gt, at, opt)` | the calm one: rises, eases out, no overshoot |
| `u(n)` / `vw(f)` / `vh(f)` | design units / fractions of the live stage |
| `VIS.slot(spec, fallback)` | a real file, or a procedural clip |
| `VIS.mesh / halftone / stripes / orbit / texture` | the generators |

### Layout across aspect ratios

Scenes are authored in a 1080×1920 design space. Size type and detail with
`u(n)`; place things with `vw(f)` / `vh(f)` — fractions of the live stage — and
the same storyboard holds up at 9:16, 1:1 and 16:9. Per-ratio type scale is
tunable per component via `units: { '16x9': 0.64 }`.

## Easing

Pick the curve from what the thing is doing, not from taste:

| what is moving | curve |
|---|---|
| arriving | an **out** curve — `quintOut`, `expoOut`: fast, then settles |
| leaving | an **in** curve — `cubicIn`, `expoIn`: eases away, then goes |
| travelling between two states | an **inOut** curve — `quintInOut`, `sineInOut` |
| struck, rather than moved | `backOut`, `spring`, `pulse` — these overshoot, so use them on purpose |

`landWord` is the struck version of a word arriving; `riseWord` is the calm one.
Kinetic Typography uses the first, Shape Morphing the second.

## Optional engine modules

`engine/morph.js` is loaded only by components that want it — one extra line in
the component's own page:

```html
<script src="../../engine/morph.js"></script>
```

It adds `HF.morph`: `sample`, `align`, `lerp`, `toPath` and `sequence` — path
interpolation, with the browser doing the path parsing. Other modules can follow
the same shape: add a file, load it where it is needed, leave the rest alone.

## Colour

A component sets three tokens in its `component.css`:

```css
:root {
  --ground: #e8ecf2;   /* the paper everything sits on   */
  --ink:    #212a38;   /* all type; never pure black     */
  --accent: #f0c978;   /* highlights, rules, fills       */
}
```

Everything else derives from those three — the engine's tints in CSS via
`color-mix`, and the canvas footage in JS via `VIS.sync()`, which reads the same
three off the stage. Change them and the whole component re-skins, generators
included. Two rules worth keeping: accent is never small type (too little
contrast at label sizes — use `--ink-70`), and ink never goes pure black.

## The highlight

`.hl-row` + `.hl-block` in `engine/stage.css`. The row carries the type size and
`line-height: 1`, so its box spans the full glyph height; Inter's capitals sit
between `.137em` and `.864em` inside that box, so the block runs
`top: .092em; height: .817em` and bleeds `.055em` left and right — an even
`.045em` of accent on all four sides. Whole characters at any size, in any
aspect ratio.

```js
const row   = el('div', 'hl-row mega');
const block = el('div', 'hl-block');
const s     = split('READY', 'word');
row.append(block, s.node);
landWord(s.units[0], block, gt, 8.86, { hold: true });   // hold → stays up
```

## Media

```js
media: {
  hero: { type: 'video', src: 'media/city.mp4' },
  tile: { type: 'image', src: 'media/01.jpg' },
  spare: null                                   // → procedural clip
}
```

Files live in the component's own `media/`. Video is seeked by frame
(`currentTime = t`), so clips stay locked to the timeline in preview and export
alike — no playback drift. Slots left `null` render procedural footage, which is
why a component looks finished with zero assets.

## Rendering

```bash
node tools/render.mjs <component> [--ar 9x16|1x1|16x9] [--crf 22] [--scale 1] [--out file.mp4]
node tools/render.mjs <component> --frames 0,60,120     # contact sheet, no video
```

Needs `playwright` (from `npm install`) and `ffmpeg` on PATH. Alongside the MP4
it writes a poster frame and `*-beats.json` — the word-onset map, for cutting
music and VO against the type.

A note on file size: full-frame grain on a light ground is expensive, because
noise is what an encoder cannot predict. The grain here is light and steps on
twos, which keeps 12.6s of 1080×1920 near 6 MB at `--crf 22`. Raising it to 24
roughly halves that; past 25 the grain goes first.

## Fonts

Pages link Inter Tight and JetBrains Mono from Google Fonts, and fall back to
locally installed Inter Display / Inter. The renderer blocks the webfont request
and uses the local faces, so exports work offline.
