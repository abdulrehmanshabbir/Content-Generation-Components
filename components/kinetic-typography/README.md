# Kinetic Typography — Template 01

Bold type that moves, scales and snaps to a voice track, cut with video clips
and images. 12.6s, 30fps, six scenes.

| # | at | scene |
|---|------|-------|
| 1 | 0.0 | cold open — bars wipe, kicker, cut on a bloom |
| 2 | 1.0 | the stack — one word per beat, highlight wipe behind each |
| 3 | 3.5 | DECIDE — full-bleed footage, letters drop and track in, vocal jolt |
| 4 | 5.8 | the grid — three media tiles, captions, counter |
| 5 | 8.0 | the line — the highlight sweeps in behind READY |
| 6 | 10.5 | end card — mark, wordmark, rule |

## Re-time it to your voiceover

`component.js` opens with the beat map. Each `at` is the second that word lands:

```js
voice: [
  { at: 1.10, w: 'YOU' }, { at: 1.33, w: "DON'T" }, { at: 1.56, w: 'NEED' },
  …
]
```

Whisper with `word_timestamps=True` emits exactly this shape. Scene 2 reads the
first five entries directly; the other scenes carry their times at the top of
each scene block. Every export also writes a `*-beats.json` next to the MP4, so
an editor can cut music and VO against the type.

## Drop in real footage

```js
media: {
  hero: { type: 'video', src: 'media/city.mp4' },   // full-bleed, scene 3
  t1:   { type: 'image', src: 'media/strip.jpg' },  // b-roll strip, scene 2
  t2:   { type: 'video', src: 'media/run.mp4' },    // grid tile 01
  t3:   null,                                       // null → procedural clip
  t4:   null
}
```

Put the files in this folder's `media/`. Video is seeked by frame
(`currentTime = t`), so clips stay locked to the timeline in both preview and
export — no playback drift. Any slot left `null` renders a procedural clip,
which is why the component looks finished with zero assets.

## Palette

Three tokens in `component.css`: `--ground` `#e8ecf2`, `--ink` `#212a38`,
`--accent` `#f0c978`. Everything else on screen is a tint of one of them,
footage included.

## Render

```bash
node tools/render.mjs kinetic-typography
```

```bash
node tools/render.mjs kinetic-typography --ar 16x9 --crf 22
```

## Preview

[`previews/kinetic-typography-9x16.mp4`](../../previews/kinetic-typography-9x16.mp4) · [`previews/kinetic-typography-16x9.mp4`](../../previews/kinetic-typography-16x9.mp4)
