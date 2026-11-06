/* ───────────────────────────────────────────────────────────────────────────
   VISUALS · procedural "footage" + film grain
   ───────────────────────────────────────────────────────────────────────────
   Media slots in a component accept real files:
       { type:'video', src:'media/city.mp4' }   ← seeked by frame, stays in sync
       { type:'image', src:'media/portrait.jpg' } ← ken-burns
   A slot with no src falls back to one of these canvas generators, so a
   component looks finished with zero assets. Each generator is a pure
   function of t, drawn small and scaled up (cheap, and filmic).

   COLOUR: nothing here hard-codes a hue. VIS.sync(stage) reads --ground,
   --ink and --accent off the stage and derives every ramp from them, so a
   component sets its palette once, in CSS, and the footage follows.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const { lerp, clamp, hash, noise1 } = global.HF;

  /* live palette — filled by sync(), with sane defaults until then */
  const C = {
    ground: '#e8ecf2', groundDeep: '#cfd7e3',
    ink:    '#212a38', inkSoft:    '#6b7688',
    accent: '#f0c978', accentSoft: '#f8e4b8'
  };

  /* ramps the generators read; mutated in place so live clips follow a sync */
  const PAL = {
    acid:  [C.ground, C.accentSoft, C.accent,  C.groundDeep],
    ember: [C.ground, C.accentSoft, C.accent,  C.inkSoft],
    mono:  [C.ground, C.groundDeep, C.inkSoft, C.ink],
    ultra: [C.ground, C.groundDeep, C.inkSoft, C.ink]
  };

  /* ── colour helpers ───────────────────────────────────────────────────── */
  function parse(c) {
    c = String(c).trim();
    if (c[0] === '#') {
      const h = c.length === 4
        ? c.slice(1).split('').map(d => parseInt(d + d, 16))
        : [c.slice(1, 3), c.slice(3, 5), c.slice(5, 7)].map(d => parseInt(d, 16));
      return h;
    }
    const m = c.match(/-?\d+\.?\d*/g);
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  const hex = v => '#' + v.map(n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => hex(parse(a).map((v, i) => lerp(v, parse(b)[i], t)));

  /* Read the component's three colours off the stage and derive the rest. */
  function sync(stage) {
    const cs = getComputedStyle(stage);
    const read = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
    C.ground = read('--ground', C.ground);
    C.ink    = read('--ink',    C.ink);
    C.accent = read('--accent', C.accent);
    C.groundDeep = mix(C.ground, C.ink,    0.14);
    C.inkSoft    = mix(C.ink,    C.ground, 0.34);
    C.accentSoft = mix(C.accent, C.ground, 0.55);
    const set = (k, v) => { PAL[k].length = 0; v.forEach(x => PAL[k].push(x)); };
    set('acid',  [C.ground, C.accentSoft, C.accent,  C.groundDeep]);
    set('ember', [C.ground, C.accentSoft, C.accent,  C.inkSoft]);
    set('mono',  [C.ground, C.groundDeep, C.inkSoft, C.ink]);
    set('ultra', [C.ground, C.groundDeep, C.inkSoft, C.ink]);
    return C;
  }

  function surface(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.className = 'hf-canvas';
    return c;
  }

  /* 1 · MESH — slow drifting blobs, blurred in CSS. Reads as abstract footage */
  function mesh(pal = 'acid', seed = 1, w = 320, h = 568) {
    const c = surface(w, h), x = c.getContext('2d');
    const P = PAL[pal], blobs = Array.from({ length: 9 }, (_, i) => ({
      r: 0.20 + hash(seed * 9 + i) * 0.26,
      ax: 0.26 + hash(seed * 3 + i) * 0.24, ay: 0.34 + hash(seed * 7 + i) * 0.30,
      sx: 0.17 + hash(seed + i) * 0.33,     sy: 0.13 + hash(seed * 5 + i) * 0.31,
      px: hash(seed * 11 + i) * 6.28,       py: hash(seed * 13 + i) * 6.28,
      col: [P[1], P[2], P[1], P[2], P[2]][i % 5]
    }));
    return {
      node: c, blur: 9,
      draw(t) {
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = P[0]; x.fillRect(0, 0, w, h);
        x.globalCompositeOperation = 'source-over';
        blobs.forEach(b => {
          const cx = (0.5 + Math.sin(t * b.sx + b.px) * b.ax) * w;
          const cy = (0.5 + Math.cos(t * b.sy + b.py) * b.ay) * h;
          const r  = b.r * w * (1 + Math.sin(t * 0.6 + b.px) * 0.12);
          const g  = x.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, b.col); g.addColorStop(1, 'rgba(0,0,0,0)');
          x.globalAlpha = 0.72;
          x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill();
          x.globalAlpha = 1;
        });
        /* raked bars give the blur something to bite on */
        x.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 9; i++) {
          const yy = ((i * 74 + t * 26) % (h + 120)) - 60;
          x.fillStyle = i % 3 === 0 ? P[2] : P[1];
          x.globalAlpha = 0.16 + 0.14 * Math.sin(t * 1.4 + i);
          x.fillRect(-20, yy, w + 40, 10 + 16 * (Math.sin(t + i * 2) * 0.5 + 0.5));
        }
        x.globalAlpha = 1;
      }
    };
  }

  /* 2 · HALFTONE — duotone dot field breathing on a sine lattice */
  function halftone(pal = 'mono', seed = 2, w = 300, h = 420, step = 11) {
    const c = surface(w, h), x = c.getContext('2d');
    const P = PAL[pal];
    return {
      node: c, blur: 0,
      draw(t) {
        x.fillStyle = P[0]; x.fillRect(0, 0, w, h);
        for (let gy = step / 2; gy < h; gy += step) {
          for (let gx = step / 2; gx < w; gx += step) {
            const a = Math.sin(gx * 0.021 + t * 0.9) * Math.cos(gy * 0.014 - t * 0.6);
            const b = Math.sin((gx + gy) * 0.011 + t * 1.4);
            const n = noise1(gx * 0.03 + gy * 0.017 + t * 0.5);
            const v = clamp(0.5 + a * 0.34 + b * 0.22 + n * 0.2, 0, 1);
            const r = v * step * 0.66;
            if (r < 0.35) continue;
            x.fillStyle = v > 0.72 ? P[3] : v > 0.4 ? P[2] : P[1];
            x.beginPath(); x.arc(gx, gy, r, 0, 6.2832); x.fill();
          }
        }
      }
    };
  }

  /* 3 · STRIPES — raked bars with a travelling wave, very "motion design" */
  function stripes(pal = 'ember', seed = 3, w = 300, h = 440) {
    const c = surface(w, h), x = c.getContext('2d');
    const P = PAL[pal], L = Math.hypot(w, h) * 1.3, n = 14, band = L / n;
    return {
      node: c, blur: 0,
      draw(t) {
        x.fillStyle = P[0]; x.fillRect(0, 0, w, h);
        x.save(); x.translate(w / 2, h / 2); x.rotate(-0.38);
        for (let i = 0; i < n; i++) {
          const yy = -L / 2 + i * band;
          const k  = Math.sin(t * 1.3 + i * 0.62) * 0.5 + 0.5;
          x.fillStyle = i % 4 === 0 ? P[2] : i % 3 === 0 ? P[3] : P[1];
          x.globalAlpha = 0.28 + k * 0.62;
          x.fillRect(-L / 2, yy, L, band - 3);
        }
        /* a bright bar sweeping through the blinds */
        const sweep = -L / 2 + ((t * 150) % (L + band * 3)) - band * 1.5;
        x.globalAlpha = 0.9; x.fillStyle = P[3];
        x.fillRect(-L / 2, sweep, L, band * 0.7);
        x.restore(); x.globalAlpha = 1;
      }
    };
  }

  /* 4 · ORBIT — concentric arcs sweeping, instrument-panel energy */
  function orbit(pal = 'ultra', seed = 4, w = 300, h = 440) {
    const c = surface(w, h), x = c.getContext('2d');
    const P = PAL[pal], R = Math.max(w, h) * 0.58;
    return {
      node: c, blur: 0,
      draw(t) {
        x.fillStyle = P[0]; x.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        for (let i = 1; i <= 9; i++) {
          const r = (i / 9) * R, dir = i % 2 ? 1 : -1;
          const a0 = t * (0.45 + i * 0.16) * dir, span = 0.6 + Math.sin(t * 0.9 + i) * 0.7;
          x.strokeStyle = i === 5 ? C.accent : i % 2 ? P[2] : P[1];
          x.globalAlpha = i === 5 ? 1 : 0.92;
          x.lineWidth = i === 5 ? 9 : 4.2; x.lineCap = 'round';
          x.beginPath(); x.arc(cx, cy, r, a0, a0 + span); x.stroke();
        }
        /* radial ticks */
        x.globalAlpha = 0.5; x.strokeStyle = P[2]; x.lineWidth = 2;
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * 6.2832 + t * 0.18;
          x.beginPath();
          x.moveTo(cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88);
          x.lineTo(cx + Math.cos(a) * R * (i % 6 ? 0.94 : 1.02), cy + Math.sin(a) * R * (i % 6 ? 0.94 : 1.02));
          x.stroke();
        }
        x.globalAlpha = 1; x.fillStyle = C.ink;
        x.beginPath(); x.arc(cx, cy, 7, 0, 6.2832); x.fill();
      }
    };
  }

  /* 4b · TEXTURE — fine hatch + speckle, no shapes. Sits over footage. */
  function texture(w = 540, h = 960) {
    const c = surface(w, h), x = c.getContext('2d');
    return {
      node: c, blur: 0,
      draw(t) {
        x.clearRect(0, 0, w, h);
        x.strokeStyle = C.ink; x.lineWidth = 1; x.globalAlpha = 0.34;
        const gap = 7, off = (t * 26) % gap;
        for (let i = -h; i < w + h; i += gap) {
          x.beginPath(); x.moveTo(i + off, 0); x.lineTo(i + off - h, h); x.stroke();
        }
        x.globalAlpha = 0.28;
        for (let i = 0; i < 900; i++) {
          const k = i + Math.floor(t * 12) * 900;
          x.fillStyle = hash(k) > 0.5 ? C.inkSoft : C.ink;
          x.fillRect(hash(k * 1.7) * w, hash(k * 2.3) * h, 2, 2);
        }
        x.globalAlpha = 1;
      }
    };
  }

  /* 5 · GRAIN — six pre-baked noise tiles, cycled by frame. Deterministic,
        zero per-frame cost, and it keeps the whole piece from looking flat. */
  function grainTiles(n = 6, size = 180) {
    const urls = [];
    for (let k = 0; k < n; k++) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 128 + (hash(i * 0.37 + k * 1013) - 0.5) * 210;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      urls.push(c.toDataURL('image/png'));
    }
    return urls;
  }

  /* media slot: real file when given, generator otherwise */
  function slot(spec, fallback) {
    if (spec && spec.src && spec.type === 'image') {
      const img = global.HF.el('img', 'hf-canvas'); img.src = spec.src;
      return { node: img, blur: 0, draw() {} };
    }
    if (spec && spec.src && spec.type === 'video') {
      const v = global.HF.el('video', 'hf-canvas');
      v.src = spec.src; v.muted = true; v.playsInline = true; v.preload = 'auto';
      return { node: v, blur: 0, isVideo: true, draw(t) { if (Math.abs(v.currentTime - t) > 0.04) v.currentTime = t; } };
    }
    return fallback();
  }

  global.VIS = { C, PAL, sync, mix, mesh, halftone, stripes, orbit, texture, grainTiles, slot };
  global.HF.kit.VIS = global.VIS;
})(window);
