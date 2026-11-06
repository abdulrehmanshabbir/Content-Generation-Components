/* ───────────────────────────────────────────────────────────────────────────
   PLAYER · mounts a component, drives the persistent fx layers, fits the
   stage to its container, and exposes the hooks the offline renderer uses.

   A component page ends with:   HF.mount('my-component')

   Query params (the renderer uses them; they are harmless in a browser):
     ?render=1     strip the transport, pin the scale to 1:1 (the renderer)
     ?chrome=0     hide the transport but keep fitting (gallery thumbnails)
     ?ar=16x9      start in that aspect ratio
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const HF = global.HF;
  const { el, px, prog, E, lerp } = HF;

  HF.mount = function mount(id, opts = {}) {
    const comp = HF.components[id];
    if (!comp) throw new Error(`HF.mount: no component "${id}" — did its file load?`);

    const q        = new URLSearchParams(location.search);
    const isRender = q.get('render') === '1';
    const bare     = isRender || q.get('chrome') === '0';   /* no transport */
    const RATIOS   = Object.assign({}, HF.RATIOS, comp.ratios);
    if (comp.units) for (const k in comp.units) if (RATIOS[k]) RATIOS[k].u = comp.units[k];
    let ratio = (q.get('ar') && RATIOS[q.get('ar')]) ? q.get('ar')
              : (opts.ratio && RATIOS[opts.ratio]) ? opts.ratio : '9x16';

    /* ── stage ──────────────────────────────────────────────────────────── */
    const root  = opts.mount || document.body;
    const fit   = el('div', 'hf-fit');
    const stage = el('div', 'hf-stage');
    stage.appendChild(el('div', 'hf-bg'));
    stage.appendChild(el('div', 'hf-scenes'));

    const hudCfg = comp.hud || {};
    const hud = el('div', 'hf-hud');
    hud.innerHTML =
      `<div class="tl"><span class="dot"></span><span>${hudCfg.tl || comp.title}</span></div>
       <div class="tr"><span class="tc">00:00:00</span></div>
       <div class="bl"><span>${hudCfg.bl || ''}</span></div>`;
    if (hudCfg.off) hud.style.display = 'none';

    const grain = el('div', 'hf-grain');
    const vig   = el('div', 'hf-vig');
    const edge  = el('div', 'hf-edge');
    const flash = el('div', 'hf-flash');
    [hud, grain, vig, edge, flash].forEach(n => stage.appendChild(n));
    fit.appendChild(stage);
    root.appendChild(fit);
    if (isRender) document.body.classList.add('render');

    const tiles = global.VIS.grainTiles(6, 180);

    /* ── transport (hidden in render) ───────────────────────────────────── */
    const chrome = el('div', 'hf-chrome');
    chrome.innerHTML =
      `<button id="hf-pp" type="button">Play</button>
       <input id="hf-sc" type="range" min="0" max="100" value="0" step="1" aria-label="Timeline">
       <span class="tc" id="hf-tc">0 / 0</span>
       <span class="hf-ratios">${Object.keys(RATIOS)
         .map(r => `<button type="button" data-ar="${r}">${r.replace('x', ':')}</button>`).join('')}</span>`;
    root.appendChild(chrome);
    if (bare) chrome.style.display = 'none';
    const pp = chrome.querySelector('#hf-pp');
    const sc = chrome.querySelector('#hf-sc');
    const tc = chrome.querySelector('#hf-tc');

    /* ── build ──────────────────────────────────────────────────────────── */
    let film = null;

    function build() {
      const R = RATIOS[ratio];
      stage.style.width  = R.w + 'px';
      stage.style.height = R.h + 'px';
      stage.style.setProperty('--u', R.u);
      HF.setLayout(R.u, R.w, R.h);
      global.VIS.sync(stage);                   /* palette → procedural footage */
      stage.querySelector('.hf-scenes').innerHTML = '';

      film = new HF.Film({
        fps: comp.fps, duration: comp.duration, stage,
        loop: !isRender,
        onFrame(f, t) {
          /* Grain cycles deterministically, on twos. Every frame of full-frame
             noise is a frame the encoder cannot predict, and on a light ground
             that costs real bitrate — so it steps half as often, and sits light. */
          const gi = (f >> 1) % tiles.length;
          grain.style.backgroundImage    = `url(${tiles[gi]})`;
          grain.style.backgroundPosition = `${(gi * 53) % 180}px ${(gi * 97) % 180}px`;

          let a = 0;
          for (const fl of comp.flashes) {
            const p = prog(t, fl.at, fl.dur);
            if (p > 0 && p < 1) a = Math.max(a, (1 - E.quartOut(p)) * fl.a);
          }
          flash.style.opacity = a.toFixed(3);

          let eo = 0;
          for (const b of comp.edges) {
            const p = prog(t, b, 0.16);
            if (p > 0 && p < 1) eo = Math.max(eo, 1 - E.cubicOut(p));
          }
          edge.style.opacity = (eo * 0.9).toFixed(3);

          hud.style.opacity = hudCfg.fadeAt == null ? '1'
            : (1 - prog(t, hudCfg.fadeAt, 0.4)).toFixed(3);
          hud.querySelector('.tc').textContent =
            '00:' + String(Math.floor(t)).padStart(2, '0') + ':' + String(f % comp.fps).padStart(2, '0');

          if (!isRender) {
            sc.value = String(f);
            tc.textContent = f + ' / ' + (film.frames - 1);
            pp.textContent = film.playing ? 'Pause' : 'Play';
          }
        }
      });
      comp.scenes.forEach(s => film.scene(s));
      sc.max = String(film.frames - 1);
      resize();
      film.seek(0);
    }

    /* ── fit to the viewport ────────────────────────────────────────────── */
    function resize() {
      const R = RATIOS[ratio];
      const availH = bare ? window.innerHeight : window.innerHeight - 92;
      const availW = window.innerWidth - (bare ? 0 : 36);
      const k = isRender ? 1 : Math.max(0.05, Math.min(availW / R.w, availH / R.h));
      stage.style.setProperty('--k', k);
      fit.style.width  = (R.w * k) + 'px';
      fit.style.height = (R.h * k) + 'px';
    }
    addEventListener('resize', resize);

    pp.onclick = () => { film.toggle(); pp.textContent = film.playing ? 'Pause' : 'Play'; };
    sc.oninput = () => { film.pause(); film.seek(+sc.value); pp.textContent = 'Play'; };
    chrome.querySelectorAll('[data-ar]').forEach(b => {
      b.onclick = () => {
        ratio = b.dataset.ar; markRatio();
        const f = film.frame; film.pause(); build(); film.seek(f);
      };
    });
    function markRatio() {
      chrome.querySelectorAll('[data-ar]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.ar === ratio)));
    }
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' && e.code !== 'Space') return;
      if (e.code === 'Space')      { e.preventDefault(); pp.click(); }
      if (e.code === 'ArrowRight') { film.pause(); film.seek(film.frame + (e.shiftKey ? 10 : 1)); }
      if (e.code === 'ArrowLeft')  { film.pause(); film.seek(film.frame - (e.shiftKey ? 10 : 1)); }
    });

    markRatio(); build();

    /* At rest the page shows a composed frame rather than frame zero — that is
       what a thumbnail and a reduced-motion viewer see. Playback starts after. */
    if (!isRender) {
      const rest = comp.restFrame != null ? comp.restFrame : Math.round(film.frames * 0.27);
      film.seek(rest);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setTimeout(() => { if (!film.playing) { film.frame = 0; film.play(); } }, 900);
      }
    }

    /* ── hooks for tools/render.mjs ─────────────────────────────────────── */
    global.hf = {
      id, component: comp,
      get frames() { return film.frames; },
      get fps() { return film.fps; },
      seek(f) { film.pause(); film.seek(f); return film.frame; },
      beats: comp.voice,
      ready: true
    };
    return global.hf;
  };

  /* mount once the document body exists, wherever the scripts landed */
  HF.ready = function (fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };
})(window);
