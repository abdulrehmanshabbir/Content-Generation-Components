/* ───────────────────────────────────────────────────────────────────────────
   RENDER · frame-exact export to MP4, via Chromium + ffmpeg
   ───────────────────────────────────────────────────────────────────────────
     node tools/render.mjs kinetic-typography
     node tools/render.mjs kinetic-typography --ar 16x9 --crf 22
     node tools/render.mjs _starter --scale 0.5 --crf 26        fast proof
     node tools/render.mjs kinetic-typography --frames 0,60,120 contact sheet

   Because every frame is a pure function of the frame index this is just:
   seek(f) → screenshot → pipe to ffmpeg. No capture drift, no dropped frames.

   Needs: playwright (npm i) and ffmpeg on PATH.
   ─────────────────────────────────────────────────────────────────────────── */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
function loadPlaywright() {
  /* createRequire gives us the CJS resolver, so a global install on NODE_PATH
     works as well as a local one from `npm install` */
  for (const id of ['playwright', 'playwright-core']) {
    try { return require_(id); } catch { /* try the next */ }
  }
  console.error('playwright not found — run:  npm install');
  process.exit(1);
}

const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const has  = k => argv.includes('--' + k);

/* first bare argument is the component id; flags that take a value skip one */
const VALUED = new Set(['ar', 'crf', 'scale', 'out', 'frames']);
let ID = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { if (VALUED.has(argv[i].slice(2))) i++; continue; }
  ID = argv[i]; break;
}

if (!ID) {
  console.error('usage: node tools/render.mjs <component> [--ar 9x16] [--crf 22] [--scale 1] [--out file.mp4]');
  process.exit(1);
}

const AR    = flag('ar', '9x16');
const SCALE = parseFloat(flag('scale', '1'));
const CRF   = flag('crf', '22');
const SIZE  = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] }[AR];
if (!SIZE) { console.error(`unknown --ar "${AR}" — use 9x16, 1x1 or 16x9`); process.exit(1); }
const OUT   = path.resolve(ROOT, flag('out', `out/${ID}-${AR}.mp4`));
const W = Math.round(SIZE[0] * SCALE / 2) * 2;
const H = Math.round(SIZE[1] * SCALE / 2) * 2;

const page_url = `components/${ID}/index.html`;
try { await access(path.join(ROOT, page_url)); }
catch { console.error(`no component at ${page_url}`); process.exit(1); }

/* ── a static server, so relative paths and ES-less scripts behave ────── */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm',
               '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
               '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

await mkdir(path.dirname(OUT), { recursive: true });

const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text']
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('  [page]', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('  [console]', m.text()); });
/* local Inter / JetBrains Mono are enough; skip the webfont round trip */
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

await page.goto(`http://127.0.0.1:${PORT}/${page_url}?render=1&ar=${AR}`, { waitUntil: 'load' });
await page.addStyleTag({ content: `
  .hf-stage{left:0!important;top:0!important;transform:scale(${SCALE})!important;transform-origin:0 0!important}
  body{display:block!important;overflow:hidden;padding:0!important;margin:0!important}
  .hf-fit{width:${W}px!important;height:${H}px!important}` });
await page.waitForFunction('window.hf && window.hf.ready');
const { frames, fps, beats, title } = await page.evaluate(() => ({
  frames: hf.frames, fps: hf.fps, beats: hf.beats, title: hf.component.title
}));
console.log(`· ${title} · ${AR} ${W}×${H} · ${frames} frames @ ${fps}fps → ${path.relative(ROOT, OUT)}`);

const clip = { x: 0, y: 0, width: W, height: H };

/* ── contact sheet instead of a video ─────────────────────────────────── */
if (has('frames')) {
  const dir = path.join(ROOT, 'out', `${ID}-frames`);
  await mkdir(dir, { recursive: true });
  for (const f of flag('frames', '0').split(',').map(Number)) {
    await page.evaluate(n => hf.seek(n), f);
    await page.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`), clip });
  }
  console.log('· frames written to', path.relative(ROOT, dir));
  await browser.close(); server.close(); process.exit(0);
}

/* ── pipe frames to ffmpeg ────────────────────────────────────────────── */
const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0',
  '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF,
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', 'format=yuv420p', OUT
], { stdio: ['pipe', 'inherit', 'pipe'] });
ff.on('error', e => { console.error('ffmpeg failed to start — is it on PATH?', e.message); process.exit(1); });
let ffErr = '';
ff.stderr.on('data', d => { ffErr += d; });

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate(n => hf.seek(n), f);
  const buf = await page.screenshot({ type: 'jpeg', quality: 96, clip });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 30 === 0) process.stdout.write(`\r  ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)   `);
}
ff.stdin.end();
const code = await new Promise(r => ff.on('close', r));
console.log(`\r  ${frames}/${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s      `);
if (code !== 0) { console.error(ffErr.slice(-2500)); process.exit(1); }

/* poster + beat map, for cutting audio against the type */
await page.evaluate(n => hf.seek(n), Math.round(frames * 0.27));
await page.screenshot({ path: OUT.replace(/\.mp4$/, '-poster.jpg'), type: 'jpeg', quality: 92, clip });
await writeFile(OUT.replace(/\.mp4$/, '-beats.json'), JSON.stringify({ component: ID, fps, beats }, null, 2));

await browser.close(); server.close();
console.log('· done:', path.relative(ROOT, OUT));
