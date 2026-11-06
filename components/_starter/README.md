# Starter

The smallest component that still shows every pattern: words landing on a beat
with a highlight, and a media panel. 5s, 30fps, two scenes.

Copy this folder to begin a new component:

```bash
npm run new my-component "My Component"
```

That copies `_starter`, rewrites the id and title, and registers it in
`components/manifest.js`. Then open `components/my-component/index.html`.

## What to edit

| file | what it holds |
|---|---|
| `component.js` | timing, the voice beat map, media slots, the scenes |
| `component.css` | the three colours, and any styling of its own |
| `media/` | your clips and images |
| `index.html` | loads the engine, then this component, then mounts it |

## The one rule

`tick()` must be a pure function of time. Read `gt` (global seconds) or `lt`
(seconds since the scene opened) and write transforms — never accumulate state
between frames. That is what makes scrubbing exact and the MP4 reproducible.

## Preview

[`previews/_starter-9x16.mp4`](../../previews/_starter-9x16.mp4)
