// Run after npm run build: catch missing Tailwind compilation in deployable assets.
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = new URL('../.next/static/', import.meta.url);
const css = readdirSync(base, { recursive: true }).filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(new URL(file, base), 'utf8')).join('\n');
assert.ok(css.length > 0, 'No built CSS');
for (const rule of [/\.fixed\s*\{position:fixed/, /\.w-full\s*\{width:100%/, /\.sr-only\s*\{/, /\.z-50\s*\{z-index:50/]) {
  assert.match(css, rule, 'Missing essential modal/input utility');
}
assert.ok(!css.includes('@tailwind utilities'), 'Uncompiled Tailwind directive shipped');
console.log('Built CSS: modal position, stacking, full-width input and screen-reader utilities present.');
