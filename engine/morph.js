/* ───────────────────────────────────────────────────────────────────────────
   MORPH · path interpolation — "A becomes B"
   ───────────────────────────────────────────────────────────────────────────
   Optional engine module. A component opts in by adding one line to its page:

       <script src="../../engine/morph.js"></script>

   Three steps, and the whole technique is in them:

     SAMPLE   walk both outlines at even arc-length intervals, so each is the
              same ordered list of points. The browser parses the `d` for us
              (getPointAtLength handles lines, curves and arcs alike).
     ALIGN    rotate the second list's starting index — and match its winding —
              so point i on A corresponds to point i on B. Skip this and the
              shape turns inside out on the way across.
     LERP     move every point along a straight line between its two positions.
              A path at t, from two paths, with no magic in between.

   Everything here is a pure function of t, so a morph scrubs and renders
   exactly like the rest of the kit.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  /* a hidden <svg> to measure paths in; one per document */
  let bench = null;
  function measurer() {
    if (!bench) {
      bench = document.createElementNS(NS, 'svg');
      bench.setAttribute('aria-hidden', 'true');
      bench.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
      document.body.appendChild(bench);
    }
    return bench;
  }

  const f2 = n => (Math.round(n * 100) / 100);

  /* signed area — tells us which way a contour is wound */
  function area(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return a / 2;
  }

  /* ── SAMPLE ───────────────────────────────────────────────────────────────
     Any SVG path string → n points, evenly spaced along its length, wound the
     same way every time. n is the one number both shapes have to agree on.   */
  function sample(d, n = 240) {
    const svg = measurer();
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    const len = p.getTotalLength();
    const pts = new Array(n);
    for (let i = 0; i < n; i++) {
      const q = p.getPointAtLength((len * i) / n);
      pts[i] = [q.x, q.y];
    }
    svg.removeChild(p);
    return area(pts) < 0 ? pts.reverse() : pts;
  }

  /* ── ALIGN ────────────────────────────────────────────────────────────────
     Roll b so its start sits where a's does. Brute force over every offset,
     on a stride of the points — n is small and this runs once, not per frame. */
  function align(a, b) {
    const n = Math.min(a.length, b.length);
    let best = 0, bestD = Infinity;
    for (let k = 0; k < n; k++) {
      let s = 0;
      for (let i = 0; i < n; i += 3) {
        const p = a[i], q = b[(i + k) % n];
        s += (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]);
        if (s >= bestD) break;
      }
      if (s < bestD) { bestD = s; best = k; }
    }
    return b.slice(best).concat(b.slice(0, best));
  }

  /* ── LERP ─────────────────────────────────────────────────────────────── */
  function lerp(a, b, t) {
    const n = Math.min(a.length, b.length), out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = [a[i][0] + (b[i][0] - a[i][0]) * t,
                a[i][1] + (b[i][1] - a[i][1]) * t];
    }
    return out;
  }

  /* points → a `d` string. Straight segments by default: with a few hundred
     samples they read as curves, and corners stay sharp. smooth:true runs a
     Catmull-Rom through them instead, which rounds every corner.             */
  function toPath(pts, smooth) {
    const n = pts.length;
    if (!n) return '';
    if (!smooth) {
      let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
      for (let i = 1; i < n; i++) d += `L${f2(pts[i][0])} ${f2(pts[i][1])}`;
      return d + 'Z';
    }
    let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)},` +
           `${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)},` +
           `${f2(p2[0])} ${f2(p2[1])}`;
    }
    return d + 'Z';
  }

  /* ── a prepared sequence ──────────────────────────────────────────────────
       const seq = HF.morph.sequence([circle, star, square], 240);
       seq.at(0, t)      → `d` for the first morph at t (0 → 1)
       seq.points(0, t)  → the points, if you want to draw them
     Every shape is aligned to the one before it, once, at build time.        */
  function sequence(ds, n = 240) {
    const sets = [];
    ds.forEach((d, i) => {
      const pts = sample(d, n);
      sets.push(i === 0 ? pts : align(sets[i - 1], pts));
    });
    return {
      n, sets,
      count: sets.length - 1,
      points(i, t) {
        const a = sets[Math.max(0, Math.min(sets.length - 2, i))];
        const b = sets[Math.max(1, Math.min(sets.length - 1, i + 1))];
        return lerp(a, b, t);
      },
      at(i, t, smooth) { return toPath(this.points(i, t), smooth); }
    };
  }

  global.HF.morph = { sample, align, lerp, toPath, sequence, area };
})(window);
