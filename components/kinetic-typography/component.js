/* ───────────────────────────────────────────────────────────────────────────
   KINETIC TYPOGRAPHY · Template 01 — "Decide"
   ───────────────────────────────────────────────────────────────────────────
   Bold type that moves, scales and snaps to a voice track, cut with video
   clips and images. Six scenes, 12.6s, 30fps.

   To re-time the whole piece to your own voiceover, edit `voice` below: each
   `at` is the second that word lands on screen. Run your VO through any
   word-level transcriber (Whisper with word_timestamps=True gives exactly
   this shape) and paste the onsets in.

   Everything this file uses comes from HF.kit — see engine/hyperframes.js.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const { el, px, split, prog, clamp, lerp, E, T, landWord, u, vw, vh, VIS } = HF.kit;

  /* `C` is this component's own definition, so scenes can read C.media,
     C.voice and so on. It is registered with HF.define() at the bottom. */
  const C = {
    id: 'kinetic-typography',
    title: 'Kinetic Typography',
    blurb: 'Bold type snapping to a voice beat map, cut with clips and images.',
    hud: { tl: 'HYPERFRAMES', bl: 'TEMPLATE 01 · KINETIC TYPE', fadeAt: 10.3 },
    restFrame: 100,

    /* per-ratio type scale. Five lines of mega plus the rule need more room
       than a square gives at the engine default, so 1:1 gets its own value. */
    units: { '1x1': 0.62 },

    fps: 30,
    duration: 12.6,

    /* ── the voice beat map ───────────────────────────────────────────── */
    voice: [
      { at: 1.10, w: 'YOU'   }, { at: 1.33, w: "DON'T" }, { at: 1.56, w: 'NEED' },
      { at: 1.80, w: 'MORE'  }, { at: 2.12, w: 'TIME'  },
      { at: 3.86, w: 'DECIDE' },
      { at: 6.26, w: 'MOMENTUM' }, { at: 6.52, w: 'FOCUS' }, { at: 6.76, w: 'REPS' },
      { at: 8.18, w: 'START' }, { at: 8.42, w: 'BEFORE' }, { at: 8.66, w: "YOU'RE READY" },
      { at: 10.78, w: 'HYPERFRAMES' }
    ],

    /* ── media slots: give any of these a real file and it takes over ──── */
    media: {
      hero: null,   /* full-bleed scene 3  — { type:'video', src:'media/city.mp4' } */
      t1:   null,   /* b-roll strip, scene 2 — { type:'image', src:'media/01.jpg' } */
      t2:   null,   /* grid tile 01 */
      t3:   null,   /* grid tile 02 */
      t4:   null    /* grid tile 03 */
    },

    /* ── stage-wide accents ───────────────────────────────────────────── */
    flashes: [
      { at: 1.00, dur: 0.09, a: 1.00 }, { at: 3.50, dur: 0.08, a: 0.94 },
      { at: 5.80, dur: 0.07, a: 0.86 }, { at: 8.05, dur: 0.07, a: 0.88 },
      { at: 10.50, dur: 0.11, a: 1.00 }
    ],
    edges: [1.00, 4.68, 7.05, 9.56]
  };

  /* ═══ SCENE 1 · COLD OPEN ════════════════════════════════════════════ */
  const S1 = {
    name: 'cold-open', in: 0.00, out: 1.12,
    build(host) {
      host.innerHTML = '';
      const wrap = el('div');
      wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:' + px(u(26)) + ';z-index:2';
      const bars = [520, 330, 184].map((w, i) => {
        const b = el('div');
        b.style.cssText = `width:${px(u(w))};height:${px(u(14))};background:${
          i === 1 ? 'var(--accent)' : 'var(--ink)'};transform-origin:0 50%;transform:scaleX(0)`;
        wrap.appendChild(b); return b;
      });
      const k = split('HYPERFRAMES · KINETIC TYPE', 'word');
      k.node.className += ' label';
      k.node.style.cssText = `margin-top:${px(u(18))};color:var(--ink);font-size:${px(u(26))}`;
      wrap.appendChild(k.node);
      host.appendChild(wrap);
      return { bars, k: k.units, kn: k.node };
    },
    tick(r, lt) {
      r.bars.forEach((b, i) => {
        const pi = prog(lt, 0.05 + i * 0.055, 0.34), po = prog(lt, 0.70 + i * 0.045, 0.24);
        b.style.transformOrigin = po > 0 ? '100% 50%' : '0% 50%';
        b.style.transform = `scaleX(${(po > 0 ? 1 - E.expoOut(po) : E.expoOut(pi)).toFixed(4)})`;
      });
      const p = prog(lt, 0.20, 0.46), e = E.expoOut(p), o = prog(lt, 0.80, 0.22);
      r.kn.style.letterSpacing = lerp(0.62, 0.26, e).toFixed(3) + 'em';
      r.k.forEach((n, i) => {
        const pp = prog(lt, 0.20 + i * 0.05, 0.42), ee = E.expoOut(pp);
        T(n, { yp: (1 - ee) * 110, o: (pp > 0 ? 1 : 0) * (1 - E.expoOut(o)) });
      });
    }
  };

  /* ═══ SCENE 2 · THE STACK (word-per-beat snap) ═══════════════════════ */
  const S2 = {
    name: 'stack', in: 0.95, out: 3.68,
    build(host) {
      const words = C.voice.slice(0, 5);
      const wrap = el('div');
      wrap.style.cssText = `position:absolute;inset:0;z-index:2`;

      /* a letterboxed strip of footage above the read */
      const strip = el('div', 'hf-media');
      strip.style.cssText = `position:absolute;left:${px(vw(.089))};top:${px(vh(.108))};` +
        `width:${px(vw(.822))};height:${px(vh(.136))};border-radius:${px(u(20))}`;
      const sclip = VIS.slot(C.media.t1, () => VIS.stripes('ember', 11, 520, 154));
      strip.appendChild(sclip.node);
      const stint = el('div', 'hf-tint');
      stint.style.background = 'linear-gradient(90deg,rgba(232,236,242,.88),rgba(232,236,242,.12))';
      strip.appendChild(stint);
      const stripLab = el('div', 'label');
      stripLab.textContent = 'REC · 001 — B-ROLL';
      stripLab.style.cssText = `position:absolute;left:${px(u(26))};top:${px(u(22))};color:var(--ink)`;
      strip.appendChild(stripLab);

      const stack = el('div');
      stack.style.cssText = `position:absolute;left:${px(vw(.089))};top:${px(vh(.302))};will-change:transform`;
      const lines = words.map((wd, i) => {
        /* .hl-row carries the type size, so the block's em units — and its fit
           around the caps — resolve against the word's own font-size */
        const row = el('div', 'hl-row mega');
        row.style.marginBottom = `calc(-.16em + ${px(u(5))})`;
        const block = el('div', 'hl-block');
        block.style.opacity = '0';
        const sp = split(wd.w + (i === 4 ? '.' : ''), 'word');
        row.appendChild(block); row.appendChild(sp.node);
        stack.appendChild(row);
        return { row, block, inner: sp.units[0], at: wd.at };
      });

      /* rule lives inside the stack, so it travels with it on the exit */
      const rule = el('div');
      rule.style.cssText = `margin-top:${px(u(34))};height:${px(u(10))};width:${px(u(620))};` +
        `background:var(--accent);transform-origin:0 50%;transform:scaleX(0)`;
      rule.style.width = px(vw(.574));
      stack.appendChild(rule);

      const side = el('div', 'label');
      side.textContent = '01 — MOTION / VOICE SYNC';
      side.style.cssText = `position:absolute;right:${px(vw(.062))};top:${px(vh(.33))};` +
        `transform-origin:100% 0;rotate:90deg;white-space:nowrap`;

      const meta = el('div');
      meta.style.cssText = `position:absolute;left:${px(vw(.089))};bottom:${px(vh(.125))};` +
        `width:${px(vw(.822))};border-top:${px(u(2))} solid var(--ink-26);` +
        `padding-top:${px(u(22))};display:flex;justify-content:space-between`;
      meta.innerHTML = `<span class="label">TYPE LOCKED TO VOICE</span>` +
                       `<span class="label" style="color:var(--ink-70)">30 FPS · FRAME EXACT</span>`;

      wrap.appendChild(strip); wrap.appendChild(stack);
      wrap.appendChild(side); wrap.appendChild(meta);
      host.appendChild(wrap);
      return { strip, sclip, stack, lines, rule, side, meta };
    },
    tick(r, lt, gt) {
      const x = prog(gt, 3.16, 0.46), xe = E.expoInOut(x);

      /* strip wipes open, drifts, then leaves upward */
      const sp = E.expoOut(prog(lt, 0.06, 0.58));
      r.strip.style.clipPath = `inset(0% ${(100 - sp * 100).toFixed(2)}% 0% 0%)`;
      T(r.strip, { y: -xe * u(120), s: lerp(1.04, 1, sp), o: 1 - x });
      r.sclip.node.style.transform = `scale(${(1.1 + Math.sin(gt * 0.5) * 0.03).toFixed(4)})`;
      r.sclip.draw(gt);

      r.lines.forEach((L, i) => {
        landWord(L.inner, L.block, gt, L.at, { dur: i === 4 ? 0.36 : 0.28, hold: i === 4 });
        if (i === 4) {
          const pp = prog(gt, L.at, 0.52);
          L.row.style.transformOrigin = '0% 50%';
          L.row.style.transform = `scale(${(1 + E.pulse(pp) * 0.085).toFixed(4)})`;
        }
      });

      r.rule.style.transform = `scaleX(${E.expoOut(prog(gt, 2.40, 0.44)).toFixed(4)})`;
      const sl = prog(gt, 1.46, 0.5);
      T(r.side, { y: (1 - E.expoOut(sl)) * u(70), o: sl * (1 - x) });
      T(r.stack, { y: -xe * u(230), o: 1 - x, blur: x * u(9) });
      const mp = prog(gt, 2.56, 0.5);
      T(r.meta, { y: (1 - E.expoOut(mp)) * u(28) + xe * u(60), o: mp * (1 - x) });
    }
  };

  /* ═══ SCENE 3 · DECIDE (full-bleed footage + char build) ═════════════ */
  const S3 = {
    name: 'decide', in: 3.50, out: 5.98,
    build(host) {
      const media = el('div', 'hf-media');
      media.style.cssText = 'position:absolute;inset:0;z-index:1';
      const clip = VIS.slot(C.media.hero, () => VIS.mesh('acid', 7, 360, 640));
      clip.node.style.transformOrigin = '50% 50%';
      media.appendChild(clip.node);
      const tint = el('div', 'hf-tint');
      tint.style.background =
        'linear-gradient(180deg,rgba(232,236,242,.30) 0%,rgba(232,236,242,.12) 38%,rgba(232,236,242,.74) 100%),' +
        'radial-gradient(86% 46% at 26% 52%,rgba(232,236,242,.82),transparent 72%)';
      media.appendChild(tint);
      const tex = VIS.texture(540, 960);
      tex.node.style.cssText += ';mix-blend-mode:multiply;opacity:.12';
      media.appendChild(tex.node);

      const wrap = el('div');
      wrap.style.cssText = `position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;` +
        `justify-content:center;padding:0 ${px(vw(.083))}`;

      const kicker = el('div', 'label');
      kicker.textContent = '[ THE WHOLE JOB IS ONE WORD ]';
      kicker.style.marginBottom = px(u(36));

      const word = split('DECIDE', 'char');
      word.node.className += ' mega';
      word.node.style.cssText = `font-size:${px(u(228))};white-space:nowrap;` +
        `line-height:1;will-change:transform`;
      const hit = el('div');                        /* accent behind one character */
      hit.style.cssText = `position:absolute;background:var(--accent);transform-origin:50% 100%;` +
        `transform:scaleY(0);z-index:-1;top:.092em;height:.817em`;
      word.node.style.position = 'relative';
      word.node.appendChild(hit);

      const foot = el('div');
      foot.style.cssText = `position:absolute;z-index:4;opacity:0;left:${px(vw(.083))};right:${px(vw(.083))};` +
        `bottom:${px(vh(.12))};display:flex;flex-direction:column;gap:${px(u(24))}`;
      const frule = el('div');
      frule.style.cssText = `height:${px(u(4))};background:var(--ink);opacity:.35;` +
        `transform-origin:0 50%;transform:scaleX(0)`;
      const frow = el('div');
      frow.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline';
      const cap = el('div', 'label');
      cap.style.cssText = `font-size:${px(u(32))};color:var(--ink);letter-spacing:.2em`;
      const capText = 'NOT SOMEDAY. NOW.';
      const fidx = el('div', 'label');
      fidx.textContent = '02 / 06';
      fidx.style.color = 'var(--ink-70)';
      frow.appendChild(cap); frow.appendChild(fidx);
      foot.appendChild(frule); foot.appendChild(frow);

      wrap.appendChild(kicker); wrap.appendChild(word.node);
      host.appendChild(media); host.appendChild(wrap); host.appendChild(foot);
      return { media, clip, tex, wrap, foot, frule, fidx, chars: word.units, wordNode: word.node, hit, kicker, cap, capText };
    },
    tick(r, lt, gt) {
      /* footage: reveal from the centre, then a slow push-in */
      const rv = E.expoOut(prog(lt, 0, 0.52)), ex = prog(lt, 2.12, 0.36);
      const inset = lerp(26, 0, rv) + E.expoIn(ex) * 48;
      r.media.style.clipPath = `inset(${inset.toFixed(2)}% 0%)`;
      r.clip.node.style.transform = `scale(${(lerp(1.22, 1.03, lt / 2.5) + ex * 0.08).toFixed(4)})`;
      r.clip.node.style.filter = `blur(${u(r.clip.blur || 0)}px) saturate(1.25) contrast(1.05)`;
      r.clip.draw(gt); r.tex.draw(gt * 0.6);

      /* kicker */
      const kp = prog(lt, 0.18, 0.4);
      T(r.kicker, { y: (1 - E.expoOut(kp)) * u(26), o: kp * (1 - ex) });

      /* letters drop in on the beat, tracking tightening as they land */
      const t0 = 3.86;
      r.chars.forEach((c, i) => {
        const p = prog(gt, t0 + i * 0.042, 0.36), e = E.expoOut(p), b = E.backOut(p, 2.0);
        T(c, { y: (1 - e) * u(-96), r: (1 - e) * 10, s: lerp(1.5, 1, b), o: p > 0 ? 1 : 0, blur: (1 - e) * u(6) });
      });
      r.wordNode.style.letterSpacing =
        lerp(0.22, -0.045, E.expoOut(prog(gt, t0, 0.95))).toFixed(4) + 'em';

      /* vocal jolt + exit */
      const j = E.pulse(prog(gt, 4.68, 0.17));
      T(r.wordNode, { x: j * u(-30), s: 1 + j * 0.02, o: 1 - E.expoIn(ex) });

      /* accent slab behind the third letter */
      const hc = r.chars[2].getBoundingClientRect(), wc = r.wordNode.getBoundingClientRect();
      const k = wc.width ? (r.wordNode.offsetWidth / wc.width) : 1;
      r.hit.style.left   = px((hc.left - wc.left) * k - u(10));
      r.hit.style.width  = px(hc.width * k + u(20));
      r.hit.style.transform = `scaleY(${E.backOut(prog(gt, 4.24, 0.34), 2).toFixed(4)})`;

      /* typewriter caption */
      const n = Math.floor(prog(gt, 4.78, 0.52) * r.capText.length);
      r.cap.textContent = r.capText.slice(0, n) + (n > 0 && n < r.capText.length ? '_' : '');
      r.frule.style.transform = `scaleX(${E.expoOut(prog(gt, 4.56, 0.5)).toFixed(4)})`;
      const fo = prog(gt, 4.56, 0.2) * (1 - ex);
      r.foot.style.opacity = fo.toFixed(3);
      T(r.fidx, { o: prog(gt, 4.86, 0.3) });
    }
  };

  /* ═══ SCENE 4 · THE GRID (clips + images + captions) ═════════════════ */
  const S4 = {
    name: 'grid', in: 5.80, out: 8.24,
    build(host) {
      const wrap = el('div');
      wrap.style.cssText = `position:absolute;inset:0;z-index:2`;

      const head = split('THREE THINGS', 'word');
      head.node.className += ' mid';
      head.node.style.cssText = `position:absolute;left:${px(vw(.089))};top:${px(vh(.12))};color:var(--ink)`;

      const grid = el('div');
      grid.style.cssText = `position:absolute;left:${px(vw(.089))};top:${px(vh(.208))};` +
        `width:${px(vw(.822))};height:${px(vh(.545))}`;

      const defs = [
        { key: 't2', idx: '01', cap: 'MOMENTUM', at: 6.26, gen: () => VIS.halftone('mono', 2, 312, 624, 8),
          box: [0, 0, .586, 1], wipe: 'inset(0% 100% 0% 0%)' },
        { key: 't3', idx: '02', cap: 'FOCUS',    at: 6.52, gen: () => VIS.stripes('ember', 3, 344, 508),
          box: [.613, 0, .387, .488], wipe: 'inset(0% 0% 100% 0%)' },
        { key: 't4', idx: '03', cap: 'REPS',     at: 6.76, gen: () => VIS.orbit('ultra', 4, 344, 508),
          box: [.613, .512, .387, .488], wipe: 'inset(100% 0% 0% 0%)' }
      ];

      const tiles = defs.map((d, i) => {
        const t = el('div', 'hf-media');
        t.style.cssText = `position:absolute;left:${(d.box[0] * 100).toFixed(3)}%;top:${(d.box[1] * 100).toFixed(3)}%;` +
          `width:${(d.box[2] * 100).toFixed(3)}%;height:${(d.box[3] * 100).toFixed(3)}%;border-radius:${px(u(26))};` +
          `will-change:transform,clip-path`;
        const cl = VIS.slot(C.media[d.key], d.gen);
        t.appendChild(cl.node);
        const sh = el('div', 'hf-tint');
        sh.style.background = 'linear-gradient(180deg,rgba(232,236,242,.04),rgba(232,236,242,.82))';
        t.appendChild(sh);

        const idx = el('div', 'label');
        idx.textContent = d.idx;
        idx.style.cssText = `position:absolute;left:${px(u(26))};top:${px(u(22))};color:var(--ink);opacity:.8`;
        t.appendChild(idx);

        const c = split(d.cap, 'word');
        c.node.className += ' mid';
        c.node.style.cssText = `position:absolute;left:${px(u(26))};bottom:${px(u(20))};` +
          `font-size:${px(u(i ? 46 : 62))}`;
        t.appendChild(c.node);
        grid.appendChild(t);
        return { t, cl, cap: c.units[0], at: d.at, wipe: d.wipe, i };
      });

      const num = el('div');
      num.style.cssText = `position:absolute;right:${px(vw(.089))};top:${px(vh(.123))};` +
        `font-family:var(--font-mono);font-size:${px(u(82))};font-weight:700;` +
        `letter-spacing:-.04em;color:var(--ink);font-variant-numeric:tabular-nums`;

      wrap.appendChild(head.node); wrap.appendChild(grid); wrap.appendChild(num);
      host.appendChild(wrap);
      return { grid, tiles, num, head: head.units, headNode: head.node };
    },
    tick(r, lt, gt) {
      const beats = [7.05, 7.26, 7.47];
      r.head.forEach((n, i) => landWord(n, null, gt, 5.92 + i * 0.07, { dur: 0.3 }));
      const x = prog(gt, 7.84, 0.4), xe = E.expoInOut(x);
      r.tiles.forEach((T2, i) => {
        const p = prog(gt, 5.90 + i * 0.10, 0.52), e = E.expoOut(p);
        T2.t.style.clipPath = e >= 0.999 ? 'inset(0%)' :
          T2.wipe.replace(/100%/, (100 - e * 100).toFixed(2) + '%');
        const pulse = E.pulse(prog(gt, beats[i], 0.28));
        T(T2.t, {
          y: (1 - e) * u(30) - xe * u(70 + i * 22),
          s: lerp(1.07, 1, e) + pulse * 0.032,
          o: 1 - x
        });
        T2.cl.draw(gt);
        landWord(T2.cap, null, gt, T2.at, { dur: 0.32 });
      });
      r.num.textContent = Math.round(E.expoOut(prog(gt, 6.05, 1.7)) * 100) + '%';
      T(r.num, { o: prog(gt, 6.0, 0.2) * (1 - x), s: 1 + E.pulse(prog(gt, 7.60, 0.3)) * 0.07 });
      T(r.headNode, { y: -xe * u(50), o: 1 - x });
    }
  };

  /* ═══ SCENE 5 · THE LINE (highlight sweep) ═══════════════════════════ */
  const S5 = {
    name: 'line', in: 8.05, out: 10.78,
    build(host) {
      const bg = el('div', 'hf-media');
      bg.style.cssText = 'position:absolute;inset:0;z-index:1;opacity:.5';
      const bclip = VIS.mesh('acid', 31, 360, 640);
      bg.appendChild(bclip.node);
      const bt = el('div', 'hf-tint');
      bt.style.background = 'radial-gradient(74% 52% at 30% 50%,rgba(232,236,242,.62),rgba(232,236,242,.93))';
      bg.appendChild(bt);
      host.appendChild(bg);

      const wrap = el('div');
      wrap.style.cssText = `position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;` +
        `justify-content:center;padding:0 ${px(vw(.083))}`;
      const group = el('div');
      group.style.cssText = 'will-change:transform;transform-origin:0% 50%';

      const rows = [
        { w: 'START',  at: 8.18, size: 182 },
        { w: 'BEFORE', at: 8.42, size: 182 },
        { w: "YOU'RE", at: 8.66, size: 182 }
      ].map(d => {
        const row = el('div', 'hl-row big');
        row.style.fontSize = px(u(d.size));
        row.style.marginBottom = `calc(-.16em + ${px(u(5))})`;
        const s = split(d.w, 'word');
        row.appendChild(s.node); group.appendChild(row);
        return { row, inner: s.units[0], at: d.at };
      });

      /* the highlight: one accent block that covers READY whole, corner to
         corner, wiping on from the left as the voice lands on the word */
      const hrow = el('div', 'hl-row big');
      hrow.style.fontSize = px(u(182));
      const block = el('div', 'hl-block');
      const base = split('READY', 'word');
      hrow.appendChild(block); hrow.appendChild(base.node);
      group.appendChild(hrow);

      wrap.appendChild(group);

      const foot = el('div');
      foot.style.cssText = `position:absolute;z-index:3;left:${px(vw(.083))};right:${px(vw(.083))};` +
        `bottom:${px(vh(.115))};display:flex;justify-content:space-between;align-items:center;` +
        `border-top:${px(u(2))} solid var(--ink-26);padding-top:${px(u(24))};opacity:0`;
      foot.innerHTML = `<span class="label">READY IS A DECISION</span>` +
                       `<span class="label" style="color:var(--ink-70)">05 / 06</span>`;

      host.appendChild(wrap); host.appendChild(foot);
      return { group, rows, block, hinner: base.units[0], hrow, bg, bclip, foot };
    },
    tick(r, lt, gt) {
      const x = prog(gt, 10.16, 0.5), xe = E.expoInOut(x);
      r.bclip.draw(gt * 0.7);
      r.bclip.node.style.filter = `blur(${u(30)}px) saturate(1.3)`;
      r.bclip.node.style.transform = `scale(${(lerp(1.3, 1.12, lt / 2.7)).toFixed(4)})`;
      T(r.bg, { o: 0.52 * E.expoOut(prog(lt, 0, 0.6)) * (1 - x) });
      r.rows.forEach((L, i) => {
        landWord(L.inner, null, gt, L.at, { dur: 0.34 });
        T(L.row, { y: xe * (i - 1.5) * u(-46), o: 1 - x, blur: x * u(7) });
      });
      landWord(r.hinner, null, gt, 8.86, { dur: 0.34 });
      const hp = E.expoOut(prog(gt, 9.02, 0.38));
      r.block.style.transform = `scaleX(${hp.toFixed(4)})`;
      T(r.hrow, { y: xe * u(68), o: 1 - x, blur: x * u(7) });
      const pz = E.pulse(prog(gt, 9.54, 0.42));
      T(r.group, { s: 1 + pz * 0.055, r: pz * -1.1 });
      const fp = prog(gt, 9.30, 0.5);
      T(r.foot, { y: (1 - E.expoOut(fp)) * u(26) + xe * u(50), o: fp * (1 - x) });
    }
  };

  /* ═══ SCENE 6 · END CARD ═════════════════════════════════════════════ */
  const S6 = {
    name: 'end', in: 10.45, out: 12.60,
    build(host) {
      const glow = el('div');
      glow.style.cssText = 'position:absolute;inset:0;z-index:1;background:' +
        'radial-gradient(62% 42% at 50% 46%,rgba(240,201,120,.42),transparent 72%)';
      const wrap = el('div');
      wrap.style.cssText = 'position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:' + px(u(30));

      const mark = el('div');
      mark.style.cssText = `width:${px(u(180))};height:${px(u(180))};position:relative;` +
        `margin-bottom:${px(u(16))}`;
      mark.innerHTML =
        `<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke-width="5">
           <rect class="f1" x="14" y="14" width="72" height="72" rx="14" stroke="#212a38"/>
           <rect class="f2" x="26" y="26" width="48" height="48" rx="10" stroke="#f0c978"/>
           <rect class="f3" x="38" y="38" width="24" height="24" rx="6" stroke="#6b7688"/>
         </svg>`;

      const wm = split('HYPERFRAMES', 'char');
      wm.node.className += ' big';
      wm.node.style.cssText = `font-size:${px(u(104))};white-space:nowrap`;

      const rule = el('div');
      rule.style.cssText = `height:${px(u(5))};width:${px(u(420))};background:var(--ink);` +
        `transform-origin:50% 50%;transform:scaleX(0);opacity:.85`;

      const sub = el('div', 'label');
      sub.textContent = 'KINETIC TYPOGRAPHY · TEMPLATE 01';
      sub.style.cssText = `font-size:${px(u(27))};color:var(--ink);opacity:.9`;

      wrap.appendChild(mark); wrap.appendChild(wm.node);
      wrap.appendChild(rule); wrap.appendChild(sub);
      host.appendChild(glow); host.appendChild(wrap);
      return {
        glow, wrap, mark, wm: wm.units, wmNode: wm.node, rule, sub,
        f: [...mark.querySelectorAll('rect')]
      };
    },
    tick(r, lt, gt) {
      const fade = 1 - prog(gt, 12.22, 0.34);
      T(r.glow, { o: E.expoOut(prog(lt, 0.1, 0.9)) * 0.9 * fade, s: lerp(0.86, 1, E.expoOut(prog(lt, 0.1, 1.4))) });
      const mp = prog(gt, 10.58, 0.74), me = E.backOut(mp, 1.6);
      T(r.mark, { s: lerp(0.52, 1, me), r: lerp(-14, 0, E.expoOut(mp)), o: mp > 0 ? 1 : 0 });
      r.f.forEach((f, i) => {
        const fp = prog(gt, 10.62 + i * 0.1, 0.8);
        f.style.opacity = fp.toFixed(3);
        f.setAttribute('transform',
          `rotate(${(lerp(i % 2 ? 16 : -16, 0, E.expoOut(fp))).toFixed(2)} 50 50)`);
      });
      r.wmNode.style.letterSpacing = lerp(0.46, 0.085, E.expoOut(prog(gt, 10.78, 0.95))).toFixed(4) + 'em';
      r.wm.forEach((c, i) => {
        const p = prog(gt, 10.78 + i * 0.026, 0.42), e = E.expoOut(p);
        T(c, { yp: (1 - e) * 60, o: p, blur: (1 - e) * u(5) });
      });
      r.rule.style.transform = `scaleX(${E.expoOut(prog(gt, 11.22, 0.5)).toFixed(4)})`;
      const sp = prog(gt, 11.34, 0.5);
      T(r.sub, { y: (1 - E.expoOut(sp)) * u(22), o: sp });
      T(r.wrap, { o: fade });
    }
  };

  C.scenes = [S1, S2, S3, S4, S5, S6];
  HF.define(C);
})();
