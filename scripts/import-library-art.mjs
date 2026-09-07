// One-off import of built-in imagegen outputs. No model or network calls.
// Usage: node scripts/import-library-art.mjs /absolute/path/to/private-sources.json [library-v2]
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { libraryArtPaths } from '../lib/library-art.ts';
import { legacyArtPaths } from '../lib/legacy-art.ts';

const sources = JSON.parse(await readFile(process.argv[2], 'utf8'));
const family = process.argv[3] ?? 'library-v1';
if (!['library-v1', 'library-v2'].includes(family)) throw new Error('Unexpected asset family');
const allowed = family === 'library-v2' ? legacyArtPaths : libraryArtPaths;
const out = new URL(`../public/assets/${family}/`, import.meta.url);
await mkdir(out, { recursive: true });
let bytes = 0;
for (const source of sources) {
  if (!allowed.has(`/assets/${family}/${source.id}.webp`) || !path.isAbsolute(source.path)) throw new Error('Unexpected asset');
  const info = await sharp(source.path).webp({ quality: 82 }).toFile(fileURLToPath(new URL(source.id + '.webp', out)));
  bytes += info.size;
}
console.log(JSON.stringify({ imported: sources.length, bytes }));

// QA contact sheets only, never shipped as the world assets.
const sheets = `/private/tmp/xgen-art-qa-${family}`;
await mkdir(sheets, { recursive: true });
for (let start = 0; start < sources.length; start += 12) {
  const selected = sources.slice(start, start + 12);
  const tiles = [];
  for (let index = 0; index < selected.length; index++) {
    const source = selected[index];
    const x = (index % 4) * 300, y = Math.floor(index / 4) * 330;
    tiles.push({ input: await sharp(source.path).resize(292, 290, { fit: 'contain', background: '#17191c' }).png().toBuffer(), left: x + 4, top: y });
    const label = `<svg width="300" height="36"><rect width="300" height="36" fill="#17191c"/><text x="6" y="22" fill="white" font-size="13">${source.id}</text></svg>`;
    tiles.push({ input: Buffer.from(label), left: x, top: y + 290 });
  }
  const target = `${sheets}/sheet-${start / 12 + 1}.jpg`;
  await sharp({ create: { width: 1200, height: Math.ceil(selected.length / 4) * 330, channels: 3, background: '#17191c' } }).composite(tiles).jpeg({ quality: 90 }).toFile(target);
  console.log(target);
}
