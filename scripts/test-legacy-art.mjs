import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { legacyArt, legacyArtPaths } from '../lib/legacy-art.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';

void test('original six worlds have dedicated covers and 18 independent portraits', async () => {
  assert.equal(Object.keys(legacyArt).length, 6);
  assert.equal(legacyArtPaths.size, 24);
  for (const [id, art] of Object.entries(legacyArt)) {
    assert.equal(Object.keys(art.portraits).length, 3);
    const modern = studioWorlds.find(world => world.id === id);
    if (modern) {
      assert.equal(modern.cover, art.cover);
      assert.deepEqual(modern.portraits, art.portraits);
      assert.deepEqual(Object.keys(art.portraits).sort(), modern.world.characters.map(role => role.id).sort());
    }
    for (const p of [art.cover, ...Object.values(art.portraits)]) {
      assert.match(p, /^\/assets\/library-v2\/[a-z0-9-]+\.webp$/);
      const file = new URL('../public' + p, import.meta.url);
      assert.ok((await stat(file)).size > 1000);
      const meta = await sharp(fileURLToPath(file)).metadata();
      assert.equal(meta.format, 'webp');
      assert.ok(meta.width >= 512 && meta.height >= 512);
    }
  }
});

void test('legacy runtime uses independent portraits, not the shared cast montage', async () => {
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("legacyArt[suggestedPreset.id]?.portraits[role.id]"));
  assert.ok(page.includes("legacyArt['storm-manor'].portraits[role.id]"));
  assert.ok(!page.includes('/assets/storm-manor-cast.png'));
  assert.ok(!page.includes('/assets/sea-train-cover.jpg'));
  assert.ok(!page.includes('/assets/roommate-cover.jpg'));
  assert.equal(legacyArtPaths.has('/assets/library-v2/unlisted.webp'), false);
  assert.equal(legacyArtPaths.has('/assets/library-v2/../../private.webp'), false);
});
