/* ───────────────────────────────────────────────────────────────────────────
   SHAPE MORPHING · Template 02 — "A becomes B"
   ───────────────────────────────────────────────────────────────────────────
   One path interpolates into another, and then takes itself apart to show how:
   sample → align → lerp. 17.4s, 30fps, five scenes.

   Motion is deliberately plain. Arrivals use an out curve, exits use an in
   curve, and every morph — a thing travelling between two states — uses
   quintInOut. Nothing overshoots, nothing strobes.

   Needs the optional engine module: <script src="../../engine/morph.js">
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const { el, svg, px, split, prog, clamp, lerp, E, T, riseWord, u, vw, vh } = HF.kit;
  const M = HF.morph;

  /* ── the shape library ───────────────────────────────────────────────────
     Each shape is one closed contour in a 1000×1000 box centred on (0,0),
     roughly 760 across. Any `d` works: the engine samples it with the
     browser's own getPointAtLength, so lines, curves and arcs all behave.   */
  const poly = pts => 'M' + pts.map(p => p.map(Math.round).join(' ')).join('L') + 'Z';
  const star = (points, outer, inner) => poly(
    Array.from({ length: points * 2 }, (_, i) => {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }));

  const SHAPES = {
    circle: 'M 0 -380 A 380 380 0 1 1 -0.5 -380 Z',
    square: 'M -300 -380 H 300 A 80 80 0 0 1 380 -300 V 300 A 80 80 0 0 1 300 380 ' +
            'H -300 A 80 80 0 0 1 -380 300 V -300 A 80 80 0 0 1 -300 -380 Z',
    star:   star(5, 400, 170),
    cross:  poly([[-130,-380],[130,-380],[130,-130],[380,-130],[380,130],[130,130],
                  [130,380],[-130,380],[-130,130],[-380,130],[-380,-130],[-130,-130]]),
    play:   poly([[-250,-360],[380,0],[-250,360]]),
    heart:  'M 0 330 C -170 180 -380 40 -380 -140 C -380 -280 -275 -355 -170 -355 ' +
            'C -75 -355 -20 -295 0 -250 C 20 -295 75 -355 170 -355 C 275 -355 380 -280 380 -140 ' +
            'C 380 40 170 180 0 330 Z',
    drop:   'M 0 -395 C 150 -200 345 -55 345 120 C 345 300 190 395 0 395 ' +
            'C -190 395 -345 300 -345 120 C -345 -55 -150 -200 0 -395 Z'
  };

  /* an absolutely placed square of SVG, in a -500…500 coordinate box */
  function shapeBox(size, cx, cy) {
    const box = el('div');
    box.style.cssText = `position:absolute;left:${px(cx - size / 2)};top:${px(cy - size / 2)};` +
      `width:${px(size)};height:${px(size)};z-index:2`;
    const s = svg('svg');
    s.setAttribute('viewBox', '-500 -500 1000 1000');
    s.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
    box.appendChild(s);
    return { box, s };
  }

  const C = {
    id: 'shape-morph',
    title: 'Shape Morphing',
    blurb: 'One path interpolates into another — and shows its working.',
    hud: { tl: 'HYPERFRAMES', bl: 'TEMPLATE 02 · SHAPE MORPHING', fadeAt: 15.6 },
    restFrame: 150,

    fps: 30,
    duration: 17.4,

    /* the words that land, and when */
    voice: [
      { at: 0.55, w: 'A' }, { at: 0.68, w: 'BECOMES' }, { at: 0.81, w: 'B' },
      { at: 5.35, w: 'ONE PATH' }, { at: 5.51, w: 'INTO ANOTHER' },
      { at: 7.55, w: 'SAMPLE' }, { at: 9.45, w: 'ALIGN' }, { at: 11.35, w: 'LERP' },
      { at: 16.05, w: 'SHAPE MORPHING' }
    ],

    media: {},          /* this one is pure vector — no footage slots */
    flashes: [],        /* no strobes: the cuts are carried by the motion */
    edges: []
  };

  /* ═══ SCENE 1 · TITLE ════════════════════════════════════════════════ */
  const S1 = {
    name: 'title', in: 0.00, out: 2.70,
    build(host) {
      const { box, s } = shapeBox(u(300), vw(.5), vh(.29));
      const shape = svg('path', 'sm-shape'); s.appendChild(shape);
      const seq = M.sequence([SHAPES.circle, SHAPES.square], 200);

      const title = el('div');
      title.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.46))};z-index:2;` +
        `display:flex;align-items:center;justify-content:center;gap:${px(u(30))}`;
      const word = (text, hl) => {
        const row = el('div', 'hl-row mega');
        row.style.fontSize = px(u(112));
        row.style.marginBottom = '0';
        const block = hl ? el('div', 'hl-block') : null;
        const sp = split(text, 'word');
        if (block) row.appendChild(block);
        row.appendChild(sp.node);
        title.appendChild(row);
        return { row, block, inner: sp.units[0] };
      };
      const parts = [word('A', true), word('BECOMES', false), word('B', true)];

      const kicker = el('div', 'label');
      kicker.textContent = 'SHAPE MORPHING · TEMPLATE 02';
      kicker.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.56))};` +
        `text-align:center;z-index:2`;

      host.append(box, title, kicker);
      return { box, shape, seq, title, parts, kicker };
    },
    tick(r, lt, gt) {
      /* a slow ping-pong morph behind the title — sineInOut, so it never jerks
         at the turn-around */
      const cyc = (lt / 2.4) % 2;
      r.shape.setAttribute('d', r.seq.at(0, E.sineInOut(cyc < 1 ? cyc : 2 - cyc)));

      const arrive = E.quintOut(prog(lt, 0.10, 0.85));      /* arriving  → out */
      const leave  = E.cubicIn(prog(gt, 2.26, 0.44));       /* leaving   → in  */
      T(r.box, { s: lerp(0.80, 1, arrive), o: arrive * (1 - leave) });

      r.parts.forEach((p, i) => {
        riseWord(p.inner, gt, 0.55 + i * 0.13, { dur: 0.74 });
        if (p.block) p.block.style.transform =
          `scaleX(${E.quartOut(prog(gt, 0.72 + i * 0.26, 0.52)).toFixed(4)})`;
      });
      T(r.title, { y: -leave * u(70), o: 1 - leave });

      const kp = E.quintOut(prog(gt, 1.20, 0.7));
      T(r.kicker, { y: (1 - kp) * u(22) - leave * u(50), o: kp * (1 - leave) });
    }
  };

  /* ═══ SCENE 2 · THE CLAIM ════════════════════════════════════════════ */
  const S2 = {
    name: 'hero', in: 2.60, out: 7.30,
    build(host) {
      const { box, s } = shapeBox(u(740), vw(.5), vh(.33));
      const shape = svg('path', 'sm-shape'); s.appendChild(shape);
      const seq = M.sequence([SHAPES.circle, SHAPES.star], 240);

      /* an A → B track, so the value of t is something you can see */
      const track = el('div');
      track.style.cssText = `position:absolute;left:${px(vw(.17))};width:${px(vw(.66))};` +
        `top:${px(vh(.595))};height:${px(u(30))};z-index:2`;
      const line = el('div');
      line.style.cssText = `position:absolute;left:0;right:0;top:50%;height:${px(u(3))};` +
        `background:var(--ink);opacity:.2`;
      const knob = el('div');
      knob.style.cssText = `position:absolute;top:50%;width:${px(u(28))};height:${px(u(28))};` +
        `margin-top:${px(u(-14))};margin-left:${px(u(-14))};border-radius:50%;background:var(--ink)`;
      const la = el('div', 'label'), lb = el('div', 'label');
      la.textContent = 'A'; lb.textContent = 'B';
      la.style.cssText = `position:absolute;left:0;top:${px(u(32))}`;
      lb.style.cssText = `position:absolute;right:0;top:${px(u(32))}`;
      track.append(line, knob, la, lb);

      const tv = el('div');
      tv.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.655))};text-align:center;` +
        `font-family:var(--font-mono);font-size:${px(u(30))};letter-spacing:.18em;` +
        `color:var(--ink-70);z-index:2;font-variant-numeric:tabular-nums`;

      const head = el('div');
      head.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.715))};` +
        `text-align:center;z-index:2`;
      const lines = ['ONE PATH', 'INTO ANOTHER'].map(t => {
        const sp = split(t, 'word');
        sp.node.className += ' big';
        sp.node.style.fontSize = px(u(124));
        head.appendChild(sp.node);
        return sp;
      });

      host.append(box, track, tv, head);
      return { box, shape, seq, track, knob, tv, head, lines };
    },
    tick(r, lt, gt) {
      /* travelling between two states → an inOut curve, every time */
      const t = E.quintInOut(prog(gt, 3.35, 1.80));
      r.shape.setAttribute('d', r.seq.at(0, t));

      const arrive = E.quintOut(prog(lt, 0.08, 0.80));
      const leave  = E.cubicIn(prog(gt, 6.86, 0.44));
      T(r.box, { s: lerp(0.92, 1, arrive), o: arrive * (1 - leave) });

      r.knob.style.left = (t * 100).toFixed(2) + '%';
      r.tv.textContent = 't = ' + t.toFixed(2);
      const tp = E.quintOut(prog(gt, 3.05, 0.6));
      T(r.track, { o: tp * (1 - leave) });
      T(r.tv,    { o: tp * (1 - leave) });

      r.lines.forEach((L, i) => L.units.forEach((n, j) =>
        riseWord(n, gt, 5.35 + i * 0.16 + j * 0.06, { dur: 0.72 })));
      T(r.head, { y: -leave * u(60), o: 1 - leave });
    }
  };

  /* ═══ SCENE 3 · HOW IT WORKS ═════════════════════════════════════════ */
  const STEPS = [
    { n: '01', t: 'SAMPLE', sub: 'BOTH PATHS, SAME POINT COUNT',  code: 'morph.sample(d, 240)', at: 7.55 },
    { n: '02', t: 'ALIGN',  sub: 'MATCH THE STARTING POINT',      code: 'morph.align(a, b)',    at: 9.45 },
    { n: '03', t: 'LERP',   sub: 'EVERY POINT TRAVELS STRAIGHT',  code: 'morph.lerp(a, b, t)',  at: 11.35 }
  ];

  const S3 = {
    name: 'how', in: 7.20, out: 13.58,
    build(host) {
      const { box, s } = shapeBox(u(580), vw(.5), vh(.25));
      const seq = M.sequence([SHAPES.square, SHAPES.heart], 240);
      const STRIDE = 8;                       /* draw every 8th sample as a dot */

      const travel  = svg('g');
      const fill    = svg('path', 'sm-shape');
      const outline = svg('path', 'sm-outline');
      const dotsG   = svg('g');
      const start   = svg('circle', 'sm-start');
      start.setAttribute('r', 19);
      s.append(travel, fill, outline, dotsG, start);
      fill.style.opacity = '0';

      const lines = [], dots = [];
      for (let i = 0; i < seq.n; i += STRIDE) {
        const ln = svg('line', 'sm-travel'); travel.appendChild(ln); lines.push(ln);
        const c = svg('circle', 'sm-dot');   dotsG.appendChild(c);   dots.push(c);
      }

      const list = el('div');
      list.style.cssText = `position:absolute;left:${px(vw(.089))};right:${px(vw(.089))};` +
        `top:${px(vh(.495))};z-index:2`;
      const steps = STEPS.map((st, i) => {
        const wrap = el('div');
        wrap.style.cssText = `position:relative;margin-bottom:${px(u(44))}`;
        const top = el('div');
        top.style.cssText = `display:flex;align-items:center;gap:${px(u(26))}`;
        const num = el('div', 'label');
        num.textContent = st.n;
        const row = el('div', 'hl-row mid');
        row.style.fontSize = px(u(72));
        row.style.marginBottom = '0';
        const block = el('div', 'hl-block');
        const sp = split(st.t, 'word');
        row.append(block, sp.node);
        top.append(num, row);
        const sub = el('div', 'label');
        sub.textContent = st.sub;
        sub.style.marginTop = px(u(14));
        wrap.append(top, sub);
        list.appendChild(wrap);
        return { wrap, block, inner: sp.units[0], at: st.at, code: st.code };
      });

      const code = el('div');
      code.style.cssText = `position:absolute;left:${px(vw(.089))};top:${px(vh(.845))};` +
        `font-family:var(--font-mono);font-size:${px(u(34))};letter-spacing:.06em;` +
        `color:var(--ink);z-index:2;border-top:${px(u(2))} solid var(--ink-26);` +
        `padding-top:${px(u(22))};right:${px(vw(.089))}`;

      host.append(box, list, code);
      return { box, s, seq, stride: STRIDE, fill, outline, lines, dots, start, list, steps, code };
    },
    tick(r, lt, gt) {
      const A = r.seq.sets[0], B = r.seq.sets[1], n = r.seq.n, S = r.stride;
      const leave = E.cubicIn(prog(gt, 13.08, 0.44));

      /* 03 LERP drives the shape; before 11.75 it simply rests on A */
      const t = E.quintInOut(prog(gt, 11.75, 1.32));
      const pts = r.seq.points(0, t);
      const d = M.toPath(pts);
      r.outline.setAttribute('d', d);
      r.fill.setAttribute('d', d);
      r.fill.style.opacity = (E.quintOut(prog(gt, 11.85, 1.1)) * (1 - leave)).toFixed(3);

      /* 01 SAMPLE — the outline draws itself, then the points arrive */
      const draw = E.quartInOut(prog(gt, 7.62, 0.9));
      const len = r.outline.getTotalLength();
      r.outline.style.strokeDasharray  = len.toFixed(1);
      r.outline.style.strokeDashoffset = ((1 - draw) * len).toFixed(1);
      r.outline.style.opacity = (1 - leave).toFixed(3);

      r.dots.forEach((c, k) => {
        const p = pts[k * S];
        c.setAttribute('cx', p[0].toFixed(1));
        c.setAttribute('cy', p[1].toFixed(1));
        const a = E.quintOut(prog(gt, 8.15 + k * 0.014, 0.45)) * (1 - leave);
        c.setAttribute('r', (10 * a).toFixed(2));
        c.style.opacity = a.toFixed(3);
      });

      /* 02 ALIGN — the start point walks around the outline into place */
      const walk = E.quintInOut(prog(gt, 9.72, 1.05));
      const sp = pts[Math.round(lerp(Math.round(n * 0.37), n, walk)) % n];
      r.start.setAttribute('cx', sp[0].toFixed(1));
      r.start.setAttribute('cy', sp[1].toFixed(1));
      const sa = E.quintOut(prog(gt, 9.56, 0.4)) * (1 - E.quartInOut(prog(gt, 11.30, 0.5)));
      r.start.style.opacity = sa.toFixed(3);

      /* 03 LERP — the straight lines every point travels along */
      const tl = E.quartInOut(prog(gt, 11.48, 0.6));
      r.lines.forEach((ln, k) => {
        const a = A[k * S], b = B[k * S];
        ln.setAttribute('x1', a[0].toFixed(1)); ln.setAttribute('y1', a[1].toFixed(1));
        ln.setAttribute('x2', b[0].toFixed(1)); ln.setAttribute('y2', b[1].toFixed(1));
        ln.style.opacity = (0.3 * tl * (1 - E.quartInOut(t)) * (1 - leave)).toFixed(3);
      });

      const arrive = E.quintOut(prog(lt, 0.06, 0.7));
      T(r.box, { s: lerp(0.94, 1, arrive), o: arrive * (1 - leave) });

      /* the step list: the active one is highlighted, and hands over cleanly */
      r.steps.forEach((st, i) => {
        riseWord(st.inner, gt, 7.46 + i * 0.1, { dur: 0.62 });
        const on  = E.quartOut(prog(gt, st.at, 0.46));
        const off = E.quartInOut(prog(gt, i < 2 ? r.steps[i + 1].at - 0.14 : 13.0, 0.42));
        st.block.style.transformOrigin = off > 0 ? '100% 50%' : '0% 50%';
        st.block.style.transform = `scaleX(${(off > 0 ? 1 - off : on).toFixed(4)})`;
        const seen = E.quintOut(prog(gt, 7.42 + i * 0.1, 0.6));   /* all three, early */
        T(st.wrap, { o: seen * lerp(0.34, 1, on * (1 - off)) * (1 - leave) });
      });

      const ci = gt >= r.steps[2].at ? 2 : gt >= r.steps[1].at ? 1 : 0;
      r.code.textContent = r.steps[ci].code;
      const cf = E.quintOut(clamp((gt - r.steps[ci].at) / 0.42, 0, 1));
      T(r.code, { y: (1 - cf) * u(14), o: cf * (1 - leave) });
    }
  };

  /* ═══ SCENE 4 · THE CHAIN ════════════════════════════════════════════ */
  const S4 = {
    name: 'chain', in: 13.48, out: 15.78,
    build(host) {
      const { box, s } = shapeBox(u(580), vw(.5), vh(.355));
      const shape = svg('path', 'sm-shape'); s.appendChild(shape);
      const seq = M.sequence([SHAPES.heart, SHAPES.cross, SHAPES.play, SHAPES.drop], 240);
      const names = ['HEART', 'CROSS', 'PLAY', 'DROP'];

      const name = el('div', 'big');
      name.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.615))};` +
        `text-align:center;font-size:${px(u(116))};z-index:2`;
      const sub = el('div', 'label');
      sub.textContent = 'ONE SEQUENCE · ALIGNED ONCE';
      sub.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.70))};` +
        `text-align:center;z-index:2`;

      host.append(box, name, sub);
      return { box, shape, seq, names, name, sub };
    },
    tick(r, lt, gt) {
      const t0 = 13.80, step = 0.62, run = 0.46;
      const k = clamp(Math.floor((gt - t0) / step), 0, r.seq.count - 1);
      const local = E.quintInOut(clamp(((gt - t0) - k * step) / run, 0, 1));
      r.shape.setAttribute('d', r.seq.at(k, local));

      const arrive = E.quintOut(prog(lt, 0.04, 0.5));
      const leave  = E.cubicIn(prog(gt, 15.40, 0.38));
      T(r.box, { s: lerp(0.95, 1, arrive), o: arrive * (1 - leave) });

      /* the label swaps at the midpoint of each morph, dipping as it goes */
      r.name.textContent = r.names[local > 0.5 ? k + 1 : k];
      const dip = Math.abs(local * 2 - 1);
      T(r.name, { o: (0.12 + 0.88 * dip) * arrive * (1 - leave) });
      T(r.sub,  { o: E.quintOut(prog(gt, 13.9, 0.5)) * (1 - leave) });
    }
  };

  /* ═══ SCENE 5 · END CARD ═════════════════════════════════════════════ */
  const S5 = {
    name: 'end', in: 15.68, out: 17.40,
    build(host) {
      const { box, s } = shapeBox(u(230), vw(.5), vh(.355));
      const shape = svg('path', 'sm-shape'); s.appendChild(shape);
      const seq = M.sequence([SHAPES.drop, SHAPES.circle], 200);

      const wrap = el('div');
      wrap.style.cssText = `position:absolute;left:0;right:0;top:${px(vh(.47))};` +
        `text-align:center;z-index:2;display:flex;flex-direction:column;align-items:center;` +
        `gap:${px(u(26))}`;
      const mark = split('SHAPE MORPHING', 'word');
      mark.node.className += ' big';
      mark.node.style.fontSize = px(u(92));
      const rule = el('div');
      rule.style.cssText = `height:${px(u(4))};width:${px(u(360))};background:var(--ink);` +
        `opacity:.75;transform-origin:50% 50%;transform:scaleX(0)`;
      const sub = el('div', 'label');
      sub.textContent = 'HYPERFRAMES · TEMPLATE 02';
      wrap.append(mark.node, rule, sub);

      host.append(box, wrap);
      return { box, shape, seq, wrap, mark, rule, sub };
    },
    tick(r, lt, gt) {
      r.shape.setAttribute('d', r.seq.at(0, E.quintInOut(prog(gt, 15.88, 0.82))));
      const arrive = E.quintOut(prog(lt, 0.02, 0.6));
      const fade   = 1 - E.cubicIn(prog(gt, 17.02, 0.36));
      T(r.box, { s: lerp(1.12, 1, arrive), o: arrive * fade });

      r.mark.units.forEach((n, i) => riseWord(n, gt, 16.05 + i * 0.09, { dur: 0.7 }));
      r.rule.style.transform = `scaleX(${E.quartInOut(prog(gt, 16.45, 0.55)).toFixed(4)})`;
      const sp = E.quintOut(prog(gt, 16.60, 0.6));
      T(r.sub, { y: (1 - sp) * u(16), o: sp });
      T(r.wrap, { o: fade });
    }
  };

  C.scenes = [S1, S2, S3, S4, S5];
  HF.define(C);
})();
