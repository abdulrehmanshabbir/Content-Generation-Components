/* ───────────────────────────────────────────────────────────────────────────
   NEW COMPONENT · copies _starter into a new folder and registers it
     node tools/new-component.mjs my-component "My Component"
   ─────────────────────────────────────────────────────────────────────────── */
import { cp, readFile, writeFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, titleArg] = process.argv.slice(2);

if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error('usage: node tools/new-component.mjs <id> ["Title"]');
  console.error('       id: lowercase letters, digits and hyphens');
  process.exit(1);
}
const title = titleArg || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const dest  = path.join(ROOT, 'components', id);

try { await access(dest); console.error(`components/${id} already exists`); process.exit(1); } catch {}

await cp(path.join(ROOT, 'components', '_starter'), dest, { recursive: true });
await mkdir(path.join(dest, 'media'), { recursive: true });

const sub = async (file, pairs) => {
  let s = await readFile(path.join(dest, file), 'utf8');
  for (const [a, b] of pairs) s = s.split(a).join(b);
  await writeFile(path.join(dest, file), s);
};
await sub('component.js', [["id: '_starter'", `id: '${id}'`],
                           ["title: 'Starter'", `title: '${title}'`],
                           ["bl: 'STARTER'", `bl: '${title.toUpperCase()}'`]]);
await sub('index.html',  [['Starter — Hyperframes', `${title} — Hyperframes`],
                          ["HF.mount('_starter')", `HF.mount('${id}')`]]);
await sub('README.md',   [['# Starter', `# ${title}`]]);

/* register it in the gallery manifest */
const mpath = path.join(ROOT, 'components', 'manifest.js');
let m = await readFile(mpath, 'utf8');
m = m.replace(/\n\];\s*$/, `,\n  {\n    dir: '${id}',\n    title: '${title}',\n    blurb: '',\n    meta: '',\n    preview: ''\n  }\n];\n`);
await writeFile(mpath, m);

console.log(`✓ components/${id}`);
console.log(`  edit   components/${id}/component.js`);
console.log(`  open   http://localhost:5173/components/${id}/   (npm start)`);
console.log(`  render node tools/render.mjs ${id}`);
