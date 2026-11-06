/* ───────────────────────────────────────────────────────────────────────────
   HYPERFRAMES · the engine
   ───────────────────────────────────────────────────────────────────────────
   One idea runs through all of it: every property of every layer is a pure
   function of the frame index. No CSS keyframes, no state accumulated across
   requestAnimationFrame. Which buys:

     • seek(f) is exact            → scrubbing is frame accurate
     • rendering is reproducible   → the MP4 matches the browser pixel for pixel
     • timing is authored in seconds against a voice beat map

   Components never touch this file. They call HF.define() and build their
   scenes out of HF.kit. See components/_starter for the smallest example.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  /* ── math ─────────────────────────────────────────────────────────────── */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, p) => a + (b - a) * p;
  const map   = (v, a, b, c, d) => lerp(c, d, clamp((v - a) / (b - a)));

  /* progress of t through a window that starts at `at` and lasts `dur` */
  const prog = (t, at, dur) => clamp((t - at) / dur, 0, 1);

  /* ── easings ──────────────────────────────────────────────────────────── */
  /* Pick by what the thing is doing:
       something ARRIVING  → an out curve (fast, then settles)  quintOut, expoOut
       something LEAVING   → an in curve  (eases away, then goes) cubicIn, expoIn
       something TRAVELLING between two states → an inOut curve  quintInOut
     The back/spring/pulse curves overshoot; use them only when a move should
     feel struck rather than smooth.                                          */
  const E = {
    lin:       p => p,
    quadIn:    p => p * p,
    sineIn:    p => 1 - Math.cos((p * Math.PI) / 2),
    sineOut:   p => Math.sin((p * Math.PI) / 2),
    sineInOut: p => -(Math.cos(Math.PI * p) - 1) / 2,
    cubicIn:   p => p * p * p,
    cubicOut:  p => 1 - Math.pow(1 - p, 3),
    quartOut:  p => 1 - Math.pow(1 - p, 4),
    quintOut:  p => 1 - Math.pow(1 - p, 5),
    cubicInOut: p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
    quartIn:    p => p * p * p * p,
    quartInOut: p => p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2,
    quintIn:    p => Math.pow(p, 5),
    quintInOut: p => p < 0.5 ? 16 * Math.pow(p, 5) : 1 - Math.pow(-2 * p + 2, 5) / 2,
    expoOut:   p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    expoIn:    p => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    expoInOut: p => p <= 0 ? 0 : p >= 1 ? 1
      : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
    /* the kinetic-type workhorse: fast arrival with a small overshoot */
    backOut: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
    /* damped spring, settled by p = 1 */
    spring: (p, freq = 3.2, damp = 5.4) =>
      p >= 1 ? 1 : 1 - Math.exp(-damp * p) * Math.cos(freq * Math.PI * p),
    /* one-shot impulse 0 → 1 → 0, for punches and jolts */
    pulse: p => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p)),
    /* hard snap, for on-beat accents */
    snap: p => (p >= 1 ? 1 : 1 - Math.pow(1 - p, 7))
  };

  /* ── deterministic noise (frame-seeded; never Math.random) ────────────── */
  function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453123; return s - Math.floor(s); }
  function noise1(x) {
    const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f);
    return lerp(hash(i), hash(i + 1), k) * 2 - 1;
  }

  /* ── dom ──────────────────────────────────────────────────────────────── */
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const px = n => n.toFixed(2) + 'px';

  /* Split text into masked word (or character) boxes.
     Per unit:  .u > .u-in  — the mask clips, the inner moves. */
  function split(text, mode) {
    const wrap = el('div', 'hf-split hf-split--' + (mode || 'word'));
    const units = [];
    const words = String(text).split(/\s+/).filter(Boolean);
    words.forEach((w, wi) => {
      const wordBox = el('span', 'hf-word');
      if (mode === 'char') {
        [...w].forEach(ch => {
          const unit = el('span', 'u'), inner = el('span', 'u-in', ch === ' ' ? '&nbsp;' : ch);
          unit.appendChild(inner); wordBox.appendChild(unit); units.push(inner);
        });
      } else {
        const unit = el('span', 'u'), inner = el('span', 'u-in', w);
        unit.appendChild(inner); wordBox.appendChild(unit); units.push(inner);
      }
      wrap.appendChild(wordBox);
      if (wi < words.length - 1 && mode !== 'char') wrap.appendChild(document.createTextNode(' '));
    });
    return { node: wrap, units, words };
  }

  /* ── layout ───────────────────────────────────────────────────────────────
     Scenes are authored in a 1080×1920 design space. `u` scales type and
     detail; `vw`/`vh` place things as a fraction of the live stage, so one
     storyboard holds up at 9:16, 1:1 and 16:9. The player sets these before
     any scene is built.                                                      */
  const layout = { u: 1, W: 1080, H: 1920 };
  const u  = n => n * layout.u;
  const vw = f => f * layout.W;
  const vh = f => f * layout.H;

  const RATIOS = {
    '9x16': { w: 1080, h: 1920, u: 1.00 },
    '1x1':  { w: 1080, h: 1080, u: 0.74 },
    '16x9': { w: 1920, h: 1080, u: 0.64 }
  };

  /* ── per-frame writers ────────────────────────────────────────────────────
     One style write per layer per frame. Anything a scene animates goes
     through here, so there is exactly one place that touches the DOM.        */
  function T(node, o) {
    const t = [];
    if (o.x || o.y)  t.push(`translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,0)`);
    if (o.yp)        t.push(`translateY(${o.yp.toFixed(3)}%)`);
    if (o.r)         t.push(`rotate(${o.r.toFixed(3)}deg)`);
    if (o.skew)      t.push(`skewY(${o.skew.toFixed(3)}deg)`);
    if (o.s != null) t.push(`scale(${o.s.toFixed(4)})`);
    node.style.transform = t.length ? t.join(' ') : 'none';
    if (o.o != null)    node.style.opacity = o.o.toFixed(3);
    if (o.blur != null) node.style.filter = o.blur > 0.02 ? `blur(${o.blur.toFixed(2)}px)` : 'none';
  }

  /* A word that lands hard: mask-up, overshoot, de-skew — with an optional
     highlight block behind it.
       inner  the .u-in span to move (from split().units)
       mask   a .hl-block to wipe behind the word, or null
       gt     global time, at  the second the word lands
       opt    { dur, from, blur, hold }   hold keeps the highlight up          */
  function landWord(inner, mask, gt, at, opt = {}) {
    const d = opt.dur || 0.30;
    const p = prog(gt, at, d), e = E.expoOut(p), b = E.backOut(p, 1.5);
    T(inner, {
      yp:   (1 - e) * 108,
      skew: (1 - e) * -6.5,
      s:    lerp(opt.from != null ? opt.from : 0.94, 1, b),
      o:    p > 0 ? 1 : 0,
      blur: (1 - e) * (opt.blur || 4)
    });
    if (mask) {
      const wi = prog(gt, at - 0.05, 0.15);
      if (opt.hold) {                       /* stays up as a highlight */
        mask.style.transformOrigin = '0% 50%';
        mask.style.transform = `scaleX(${E.expoOut(wi).toFixed(4)})`;
        mask.style.opacity = wi > 0 ? 1 : 0;
      } else {                              /* wipes on, then off to the right */
        const wo = prog(gt, at + 0.09, 0.19);
        mask.style.transformOrigin = wo > 0 ? '100% 50%' : '0% 50%';
        mask.style.transform = `scaleX(${(wo > 0 ? 1 - E.expoOut(wo) : E.expoOut(wi)).toFixed(4)})`;
        mask.style.opacity = wi > 0 && wo < 1 ? 1 : 0;
      }
    }
  }

  /* A word that rises calmly: mask up, ease out, nothing overshoots. The quiet
     counterpart to landWord — use it when the motion should feel smooth rather
     than struck.  opt { dur, ease, blur }                                     */
  function riseWord(inner, gt, at, opt = {}) {
    const p = prog(gt, at, opt.dur || 0.62);
    const e = (opt.ease || E.quintOut)(p);
    T(inner, { yp: (1 - e) * 104, o: p > 0 ? Math.min(1, p * 3) : 0, blur: (1 - e) * (opt.blur || 0) });
    return e;
  }

  /* namespaced element makers: el() for HTML, svg() for vectors */
  function svg(tag, cls) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (cls) n.setAttribute('class', cls);
    return n;
  }

  /* ── the film ─────────────────────────────────────────────────────────── */
  class Film {
    constructor(opts) {
      this.fps      = opts.fps || 30;
      this.duration = opts.duration;
      this.frames   = Math.round(this.duration * this.fps);
      this.stage    = opts.stage;
      this.scenes   = [];
      this.frame    = 0;
      this.playing  = false;
      this.loop     = !!opts.loop;
      this._onFrame = opts.onFrame || null;
      this._raf = 0; this._t0 = 0; this._f0 = 0;
    }

    /* scene = { name, in, out, build(host, film) -> refs, tick(refs, lt, gt, film) } */
    scene(def) {
      const host = el('div', 'hf-scene');
      host.dataset.name = def.name;
      this.stage.querySelector('.hf-scenes').appendChild(host);
      const refs = def.build ? def.build(host, this) || {} : {};
      this.scenes.push({ def, host, refs });
      return this;
    }

    seek(frame) {
      this.frame = Math.max(0, Math.min(this.frames - 1, Math.round(frame)));
      const gt = this.frame / this.fps;
      for (const s of this.scenes) {
        const { def, host, refs } = s;
        const live = gt >= def.in - 1e-6 && gt < def.out;
        if (live !== s._live) { host.style.display = live ? '' : 'none'; s._live = live; }
        if (live) def.tick(refs, gt - def.in, gt, this);
      }
      if (this._onFrame) this._onFrame(this.frame, gt);
      return this;
    }

    play() {
      if (this.playing) return;
      this.playing = true;
      this._t0 = performance.now();
      this._f0 = this.frame >= this.frames - 1 ? 0 : this.frame;
      const step = () => {
        if (!this.playing) return;
        const f = this._f0 + ((performance.now() - this._t0) / 1000) * this.fps;
        if (f >= this.frames - 1) {
          this.seek(this.frames - 1); this.playing = false;
          if (this.loop) { this.frame = 0; this.play(); }
          return;
        }
        this.seek(f);
        this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }
    pause()  { this.playing = false; cancelAnimationFrame(this._raf); }
    toggle() { this.playing ? this.pause() : this.play(); }
  }

  /* ── component registry ───────────────────────────────────────────────── */
  const components = {};
  function define(def) {
    if (!def || !def.id) throw new Error('HF.define needs an id');
    components[def.id] = Object.assign({
      title: def.id, blurb: '', fps: 30, duration: 10,
      units: null, voice: [], media: {}, flashes: [], edges: [],
      hud: null, scenes: []
    }, def);
    return components[def.id];
  }

  global.HF = {
    clamp, lerp, map, prog, E, hash, noise1, el, px, split,
    layout, u, vw, vh, RATIOS, T, landWord, riseWord, svg, Film,
    setLayout(uu, W, H) { layout.u = uu; layout.W = W; layout.H = H; },
    define, components,
    /* what a component destructures at the top of its file */
    kit: { el, svg, px, split, prog, clamp, lerp, map, E, T, landWord, riseWord,
           u, vw, vh, hash, noise1 }
  };
})(window);
