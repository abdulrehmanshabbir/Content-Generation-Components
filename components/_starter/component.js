/* ───────────────────────────────────────────────────────────────────────────
   STARTER · the smallest component that still shows every pattern
   ───────────────────────────────────────────────────────────────────────────
   Copy this folder (or run `npm run new <id> "<Title>"`) and edit. Two scenes:
   words landing on a beat with a highlight, then a media panel.

   The shape of a component is always the same:

     1. pull helpers out of HF.kit
     2. describe the piece in an object — id, timing, voice, media, accents
     3. write scenes: build() makes the DOM once, tick() positions it per frame
     4. HF.define(C)

   The one rule: tick() must be a pure function of time. Read `gt` (global
   seconds) or `lt` (seconds since this scene opened) and write transforms —
   never accumulate state between frames, or scrubbing and rendering drift.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const { el, px, split, prog, lerp, E, T, landWord, u, vw, vh, VIS } = HF.kit;

  const C = {
    id: '_starter',
    title: 'Starter',
    blurb: 'The smallest working component — copy this folder to begin.',
    hud: { tl: 'HYPERFRAMES', bl: 'STARTER', fadeAt: 4.3 },

    fps: 30,
    duration: 5.0,

    /* each `at` is the second that word lands on screen */
    voice: [
      { at: 0.55, w: 'ONE' },
      { at: 0.88, w: 'LINE' },
      { at: 1.30, w: 'AT A TIME' }
    ],

    /* null → a procedural clip; or { type:'video', src:'media/clip.mp4' } */
    media: { hero: null },

    /* stage-wide hits: flashes bloom the frame, edges blink the accent border */
    flashes: [{ at: 2.30, dur: 0.09, a: 0.92 }],
    edges:   [1.30]
  };

  /* ═══ SCENE A · three words land ═════════════════════════════════════ */
  const A = {
    name: 'read', in: 0.00, out: 2.40,
    build(host) {
      const wrap = el('div');
      wrap.style.cssText = `position:absolute;inset:0;z-index:2;display:flex;` +
        `flex-direction:column;justify-content:center;padding:0 ${px(vw(.083))}`;

      const lines = C.voice.map((v, i) => {
        /* .hl-row carries the type size, so the highlight block's em units —
           and its fit around the caps — resolve against the word itself */
        const row = el('div', 'hl-row mega');
        row.style.fontSize = px(u(150));
        row.style.marginBottom = `calc(-.16em + ${px(u(6))})`;
        const block = el('div', 'hl-block');     /* the highlight */
        const s = split(v.w, 'word');
        row.appendChild(block); row.appendChild(s.node);
        wrap.appendChild(row);
        /* keep every word of the line: multi-word lines stagger by 50ms */
        return { row, block, inners: s.units, at: v.at };
      });

      host.appendChild(wrap);
      return { wrap, lines };
    },
    tick(r, lt, gt) {
      const out = prog(gt, 1.95, 0.42), oe = E.expoInOut(out);
      r.lines.forEach((L, i) => {
        /* the last word keeps its highlight up; the others wipe off */
        const last = i === r.lines.length - 1;
        L.inners.forEach((n, j) =>
          landWord(n, j === 0 ? L.block : null, gt, L.at + j * 0.05, { dur: 0.30, hold: last }));
        T(L.row, { y: -oe * u(120), o: 1 - out, blur: out * u(8) });
      });
    }
  };

  /* ═══ SCENE B · a media panel ════════════════════════════════════════ */
  const B = {
    name: 'panel', in: 2.28, out: 5.00,
    build(host) {
      const panel = el('div', 'hf-media');
      panel.style.cssText = `position:absolute;left:${px(vw(.089))};top:${px(vh(.26))};` +
        `width:${px(vw(.822))};height:${px(vh(.42))};border-radius:${px(u(26))};z-index:2`;
      /* a real file if the slot has one, a procedural clip if not */
      const clip = VIS.slot(C.media.hero, () => VIS.mesh('acid', 5, 360, 500));
      panel.appendChild(clip.node);

      const tint = el('div', 'hf-tint');
      tint.style.background = 'linear-gradient(180deg,transparent,' +
        'color-mix(in srgb, var(--ground) 84%, transparent))';
      panel.appendChild(tint);

      const cap = el('div', 'mid');
      cap.textContent = 'YOUR FOOTAGE HERE';
      cap.style.cssText = `position:absolute;left:${px(u(28))};bottom:${px(u(22))};` +
        `font-size:${px(u(54))}`;
      panel.appendChild(cap);

      const foot = el('div');
      foot.style.cssText = `position:absolute;z-index:3;left:${px(vw(.089))};right:${px(vw(.089))};` +
        `bottom:${px(vh(.16))};display:flex;justify-content:space-between;` +
        `border-top:${px(u(2))} solid var(--ink-26);padding-top:${px(u(22))}`;
      foot.innerHTML = `<span class="label">EDIT COMPONENT.JS</span>` +
                       `<span class="label">01 / 01</span>`;

      host.appendChild(panel); host.appendChild(foot);
      return { panel, clip, foot };
    },
    tick(r, lt, gt) {
      /* a wipe in, a slow push, a lift out */
      const e  = E.expoOut(prog(lt, 0.04, 0.55));
      const ex = prog(gt, 4.50, 0.45), xe = E.expoInOut(ex);
      r.panel.style.clipPath = e >= 0.999 ? 'inset(0%)'
        : `inset(0% ${(100 - e * 100).toFixed(2)}% 0% 0%)`;
      T(r.panel, { y: (1 - e) * u(28) - xe * u(70), s: lerp(1.06, 1, e), o: 1 - ex });
      r.clip.node.style.transform = `scale(${(1.1 - lt * 0.02).toFixed(4)})`;
      r.clip.node.style.filter = `blur(${u(r.clip.blur || 0)}px) saturate(1.2)`;
      r.clip.draw(gt);                       /* procedural clips draw per frame */
      const fp = prog(gt, 2.70, 0.5);
      T(r.foot, { y: (1 - E.expoOut(fp)) * u(24), o: fp * (1 - ex) });
    }
  };

  C.scenes = [A, B];
  HF.define(C);
})();
